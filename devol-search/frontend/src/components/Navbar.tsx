import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <NavLink to="/" className="font-serif text-xl font-bold tracking-widest text-ink">
          DEVOL
        </NavLink>
        <div className="flex items-center gap-1">
          {[
            { to: "/", label: "Buscar" },
            { to: "/favorites", label: "Favoritos" },
            { to: "/saved", label: "Guardados" },
            { to: "/admin", label: "Admin" },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-terracota border-b-2 border-terracota"
                    : "text-gray-500 hover:text-ink"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
