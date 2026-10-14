"""
End-to-end auth and permission checks. Run against a FRESH local database,
never production: it creates accounts and trips the rate limiter.

  npm run build && npx next start -p 3000          (terminal 1)
  npm run db:migrate
  npm run create-superuser -- nivz                  (copy the link it prints)
  python3 tests/e2e_auth.py "<link>"               (terminal 2)

Requires: pip install playwright && playwright install chromium
Re-run after upgrading better-auth or next.
"""
import base64, hashlib, hmac, os, struct, sys, time
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
SUPER_LINK = sys.argv[1]  # setup link printed by: npm run create-superuser -- nivz
results = []

def check(name, ok, info=""):
    results.append((name, bool(ok), info))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""), flush=True)

def totp(secret, offset=0):
    key = base64.b32decode(secret.upper() + "=" * (-len(secret) % 8))
    counter = int(time.time() // 30) + offset
    h = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    o = h[-1] & 0x0F
    return str((struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000).zfill(6)

def set_password(page, link, pw):
    page.goto(link)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("#password")
    page.fill("#password", pw)
    page.fill("#confirm", pw)
    page.click("button[type=submit]")
    page.wait_for_url("**/login?done=*")

def login(page, user, pw):
    page.on("framenavigated", lambda f: check("password never appears in a URL", "password" not in f.url, f.url) if "password" in f.url else None)
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.fill("#username", user)
    page.fill("#password", pw)
    page.click("button[type=submit]")

def enroll_2fa(page, pw):
    page.goto(f"{BASE}/settings/security")
    page.wait_for_load_state("networkidle")
    page.fill("#tfa-password", pw)
    page.click("text=Set up 2FA")
    page.wait_for_selector("code")
    secret = page.locator("code").first.inner_text().strip()
    page.fill("#tfa-code", totp(secret))
    page.click("text=Turn on 2FA")
    page.wait_for_selector("text=Generate new codes")
    return secret

def wait_settle(page):
    page.wait_for_load_state("networkidle")

CSP = []
def newctx():
    c = b.new_context()
    c.on("console", lambda m: CSP.append(m.text) if "Content Security Policy" in m.text or "Refused to" in m.text else None)
    return c

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- Superuser bootstrap ----------
    su = newctx().new_page()
    su.goto(f"{BASE}/")
    check("anonymous visitor redirected to /login", "/login" in su.url)

    set_password(su, SUPER_LINK, "correct horse battery staple")
    check("setup link sets password and lands on login", "done=setup" in su.url)
    check("token removed from address bar", "#" not in su.url)

    reuse = newctx().new_page()
    reuse.goto(SUPER_LINK)
    reuse.wait_for_selector("text=Link not valid")
    check("setup link cannot be reused", True)

    login(su, "nivz", "correct horse battery staple")
    su.wait_for_url("**/settings/security**", wait_until="commit")
    check("staff without 2FA forced to security page", "required=2fa" in su.url)
    su.goto(f"{BASE}/admin")
    wait_settle(su)
    check("staff without 2FA cannot reach /admin", "/settings/security" in su.url, su.url)

    su_secret = enroll_2fa(su, "correct horse battery staple")
    check("2FA enrollment completes", su.locator("text=On").first.is_visible())

    # sign out then back in: must ask for TOTP
    su.goto(f"{BASE}/")
    wait_settle(su)
    su.click("summary")
    su.click("text=Sign out")
    su.wait_for_url("**/login", wait_until="commit")
    login(su, "nivz", "correct horse battery staple")
    su.wait_for_selector("#code")
    check("login with 2FA asks for a code", True)
    su.fill("#code", "000000")
    su.click("button[type=submit]")
    su.wait_for_selector("form [role=alert]")
    check("wrong TOTP code rejected", "didn't work" in su.locator("form [role=alert]").inner_text())
    su.fill("#code", totp(su_secret))
    su.click("button[type=submit]")
    su.wait_for_url(BASE + "/", wait_until="commit")
    wait_settle(su)
    check("correct TOTP signs in to dashboard", su.url == BASE + "/")
    check("account menu shows real user", su.locator("summary").inner_text().find("Nivz") >= 0)

    # ---------- Staff admin ----------
    su.goto(f"{BASE}/admin")
    wait_settle(su)
    check("superuser reaches /admin", "/admin" in su.url)
    def add(name, username, role="member"):
        su.fill("#new-name", name)
        su.fill("#new-username", username)
        su.select_option("#new-role", role)
        su.click("text=Create account")
        su.wait_for_selector(f"text=@{username})")
        return su.locator("code").first.inner_text().strip()

    m_link = add("Marcus Reyes", "mreyes")
    check("create member returns setup link", "/setup#" in m_link)
    c_link = add("Lena Ortiz", "lortiz", "chair")
    check("superuser can create a chair", "/setup#" in c_link)
    su.fill("#new-name", "Duplicate")
    su.fill("#new-username", "MReyes")
    su.click("text=Create account")
    su.wait_for_selector("text=already taken")
    check("duplicate username (case-insensitive) rejected", True)

    # ---------- Member ----------
    mctx = newctx()
    m = mctx.new_page()
    set_password(m, m_link, "marcus password 123")
    login(m, "mreyes", "marcus password 123")
    m.wait_for_url(BASE + "/", wait_until="commit")
    wait_settle(m)
    check("member signs in without 2FA prompt", m.url == BASE + "/")
    check("member nav hides Staff Admin", m.locator("nav >> text=Staff Admin").count() == 0)
    resp = m.goto(f"{BASE}/admin")
    check("member gets 404 on /admin", m.locator("text=Page not found").count() > 0 or (resp and resp.status == 404))

    # Member tries to escalate through Better Auth endpoints from their own browser
    r = m.evaluate("""async () => {
      const a = await fetch('/api/auth/update-user', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({role:'superuser', name:'x'})});
      const b = await fetch('/api/auth/sign-up/email', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email:'a@b.co', password:'zzzzzzzzzzzzzz', name:'x'})});
      const c = await fetch('/api/auth/admin/set-role', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({userId:'x', role:'superuser'})});
      return [a.status, b.status, c.status];
    }""")
    check("update-user / sign-up / admin endpoints unavailable", all(s in (403, 404) for s in r), str(r))

    # ---------- Chair: 2FA required, cannot disable it ----------
    cctx = newctx()
    c = cctx.new_page()
    set_password(c, c_link, "chair password 123")
    login(c, "lortiz", "chair password 123")
    c.wait_for_url("**/settings/security**", wait_until="commit")
    check("chair forced to set up 2FA", True)
    enroll_2fa(c, "chair password 123")
    status = c.evaluate("""async () => (await fetch('/api/auth/two-factor/disable', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({password:'chair password 123'})})).status""")
    check("staff cannot disable 2FA via API", status == 403, str(status))
    c.goto(f"{BASE}/admin")
    wait_settle(c)
    check("chair reaches /admin after 2FA", "/admin" in c.url)
    check("chair cannot see role controls", c.locator("#new-role").count() == 0)
    # chair should have no actions on the superuser row
    row = c.locator("li", has_text="@nivz")
    check("chair has no actions on superuser account", row.locator("button").count() == 0)

    # ---------- Disable member: kicked out, cannot sign in ----------
    su.goto(f"{BASE}/admin")
    wait_settle(su)
    su.once("dialog", lambda d: d.accept())
    su.locator("li", has_text="@mreyes").locator("button", has_text="Disable").click()
    su.wait_for_selector("text=Disabled")
    m.goto(f"{BASE}/")
    wait_settle(m)
    check("disabled member's session ends", "/login" in m.url, m.url)
    login(m, "mreyes", "marcus password 123")
    m.wait_for_selector("form [role=alert]")
    check("disabled member cannot sign in", "/login" in m.url)

    # ---------- Rate limit ----------
    rl = newctx().new_page()
    rl.goto(f"{BASE}/login")
    codes = rl.evaluate("""async () => {
      const out = [];
      for (let i = 0; i < 24; i++) {
        const r = await fetch('/api/auth/sign-in/username', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:'nivz', password:'wrong-password-' + i})});
        out.push(r.status);
      }
      return out;
    }""")
    check("brute force hits rate limit", 429 in codes, str(codes))

    check("no CSP violations on any page", not CSP, "; ".join(CSP[:3]))
    su.goto(f"{BASE}/login")
    b.close()

fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} passed")
sys.exit(1 if fails else 0)
