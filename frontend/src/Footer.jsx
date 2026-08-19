function Footer({ username, onLogout }) {
  return (
    <footer className="app-footer">
      {username && (
        <span className="footer-user">
          Signed in as <strong>{username}</strong> ·{" "}
          <button className="link-button" onClick={onLogout}>Log out</button>
        </span>
      )}
      <span className="footer-credit">Quiz App</span>
    </footer>
  );
}

export default Footer;