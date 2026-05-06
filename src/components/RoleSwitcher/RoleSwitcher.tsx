type RoleSwitcherProps = {
  label: string;
  onLogout: () => void;
};

export function RoleSwitcher({ label, onLogout }: RoleSwitcherProps) {
  return (
    <div className="role-pill">
      <span>Роль: {label}</span>
      <button className="button button--ghost" type="button" onClick={onLogout}>
        Сменить
      </button>
    </div>
  );
}
