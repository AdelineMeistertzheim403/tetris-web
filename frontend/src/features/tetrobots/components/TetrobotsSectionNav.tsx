import { NavLink } from "react-router-dom";

type TetrobotsSectionNavProps = {
  isLoggedIn: boolean;
};

export default function TetrobotsSectionNav({ isLoggedIn }: TetrobotsSectionNavProps) {
  return (
    <nav className="tetrobots-section-nav" aria-label="Navigation Tetrobots">
      <NavLink
        to="/tetrobots"
        end
        className={({ isActive }) =>
          `tetrobots-section-nav__link${isActive ? " tetrobots-section-nav__link--active" : ""}`
        }
      >
        Profils
      </NavLink>
      {isLoggedIn ? (
        <NavLink
          to="/tetrobots/relations"
          className={({ isActive }) =>
            `tetrobots-section-nav__link${isActive ? " tetrobots-section-nav__link--active" : ""}`
          }
        >
          Centre de liaison
        </NavLink>
      ) : null}
    </nav>
  );
}
