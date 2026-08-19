function BackButton({ visible, onClick }) {
  if (!visible) return null;
  return (
    <button className="global-back-button" onClick={onClick}>
      ← Back
    </button>
  );
}

export default BackButton;