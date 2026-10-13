export default function Support() {
  const email = process.env.SUPPORT_EMAIL;
  return <main className="auth-page"><article className="auth-card"><h1>Stoqo support</h1><p>For account and store help, use your app settings. To delete your account, open Settings → Delete account. Store owners must confirm closure of their stores.</p>{email && <p>For help or a request to delete your account and data without the app, contact <a href={`mailto:${email}?subject=Stoqo%20support`}>{email}</a>. Include your account email and store name. We will verify ownership before processing the request.</p>}<p>Do not send your password or API keys.</p></article></main>;
}
