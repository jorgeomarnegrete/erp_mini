import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import * as LucideIcons from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// HOC para renderizar iconos dinamicos (Maneja fallos si el icono no existe)
const DynamicIcon = ({ name, className }) => {
  const IconComponent = LucideIcons[name];
  if (!name || !IconComponent) return <LucideIcons.Circle className={className} />;
  return <IconComponent className={className} />;
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Diccionario de estado abierto para menús padres
  const [openMenus, setOpenMenus] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = (menuId) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Reconstruir árbol de menús permitidos a partir de la lista lineal (user.menus)
  const buildMenuTree = (menuList) => {
    if (!menuList) return [];
    
    let tree = [];
    let lookup = {};

    menuList.forEach(menu => {
      lookup[menu.id] = { ...menu, submenus: [] };
    });

    menuList.forEach(menu => {
      if (menu.parent_id === null) {
        tree.push(lookup[menu.id]);
      } else if (lookup[menu.parent_id]) {
        lookup[menu.parent_id].submenus.push(lookup[menu.id]);
      }
    });

    // Ordenar
    const sortMenus = (menus) => {
      menus.sort((a, b) => a.orden - b.orden);
      menus.forEach(m => sortMenus(m.submenus));
    };
    sortMenus(tree);

    return tree;
  };

  const userMenuTree = buildMenuTree(user?.menus);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-md border-b border-gray-100 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center shrink-0 mr-8">
                <span className="text-2xl font-black text-indigo-600 tracking-tighter hover:text-indigo-800 transition-colors">GestCom</span>
              </Link>
              <div className="hidden sm:flex space-x-2">
                {userMenuTree.map(menu => (
                  <div key={menu.id} className="relative group flex items-center">
                    {menu.submenus && menu.submenus.length > 0 ? (
                      <>
                        <button 
                          onClick={() => toggleMenu(menu.id)}
                          onMouseEnter={() => setOpenMenus({...openMenus, [menu.id]: true})}
                          onMouseLeave={() => setOpenMenus({...openMenus, [menu.id]: false})}
                          className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 
                            ${openMenus[menu.id] ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'}`}
                        >
                          <DynamicIcon name={menu.icono} className="w-4 h-4 mr-2" />
                          {menu.nombre}
                          <LucideIcons.ChevronDown className={`w-4 h-4 ml-1.5 transition-transform duration-200 ${openMenus[menu.id] ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Submenú Dropdown flotante */}
                        <div 
                          onMouseEnter={() => setOpenMenus({...openMenus, [menu.id]: true})}
                          onMouseLeave={() => setOpenMenus({...openMenus, [menu.id]: false})}
                          className={`absolute left-0 top-full mt-1 w-56 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 transition-all duration-200 origin-top-left
                            ${openMenus[menu.id] ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}
                        >
                          <div className="py-2">
                            {menu.submenus.map(child => {
                              const isActive = location.pathname === child.ruta;
                              return (
                                <Link
                                  key={child.id}
                                  to={child.ruta || '#'}
                                  onClick={() => setOpenMenus({...openMenus, [menu.id]: false})}
                                  className={`flex items-center px-4 py-3 text-sm transition-colors
                                    ${isActive 
                                      ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600' 
                                      : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border-l-4 border-transparent'}`}
                                >
                                  <DynamicIcon name={child.icono} className={`w-4 h-4 mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                  {child.nombre}
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <Link
                        to={menu.ruta || '#'}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                          ${location.pathname === menu.ruta ? 'bg-indigo-100 text-indigo-800' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'}`}
                      >
                        <DynamicIcon name={menu.icono} className="w-4 h-4 mr-2" />
                        {menu.nombre}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <div className="hidden sm:flex flex-col items-end mr-4">
                <span className="text-sm font-bold text-gray-800">{user?.nombre || "—"}</span>
                <span className="text-xs text-indigo-600 capitalize">{user?.is_admin ? "Administrador" : "Usuario"}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mr-2 sm:mr-0"
                title="Cerrar Sesión"
              >
                <LucideIcons.LogOut className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">Salir</span>
              </button>

              {/* Botón menú móvil */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                {isMobileMenuOpen ? (
                  <LucideIcons.X className="block h-6 w-6 text-indigo-600" aria-hidden="true" />
                ) : (
                  <LucideIcons.Menu className="block h-6 w-6 text-gray-600" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Menú Móvil Desplegable */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full`}>
          <div className="pt-2 pb-4 space-y-1 px-4 max-h-[80vh] overflow-y-auto">
            {/* Info usuario móvil */}
            <div className="flex items-center px-4 py-3 border-b border-gray-100 mb-2">
              <div>
                <div className="text-base font-bold text-gray-800">{user?.nombre || "—"}</div>
                <div className="text-sm font-medium text-indigo-600 capitalize">{user?.is_admin ? "Administrador" : "Usuario"}</div>
              </div>
            </div>

            {userMenuTree.map(menu => (
              <div key={menu.id} className="block">
                {menu.submenus && menu.submenus.length > 0 ? (
                  <>
                    <button
                      onClick={() => toggleMenu(menu.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-base font-semibold rounded-lg transition-colors
                        ${openMenus[menu.id] ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center">
                        <DynamicIcon name={menu.icono} className="w-5 h-5 mr-3" />
                        {menu.nombre}
                      </div>
                      <LucideIcons.ChevronDown className={`w-5 h-5 transition-transform duration-200 ${openMenus[menu.id] ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <div className={`${openMenus[menu.id] ? 'block' : 'hidden'} pl-4 pr-2 mt-1 space-y-1 border-l-2 border-indigo-100 ml-6`}>
                      {menu.submenus.map(child => {
                        const isActive = location.pathname === child.ruta;
                        return (
                          <Link
                            key={child.id}
                            to={child.ruta || '#'}
                            className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors
                              ${isActive ? 'text-indigo-700 bg-indigo-50/50 font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'}`}
                          >
                            <DynamicIcon name={child.icono} className={`w-4 h-4 mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                            {child.nombre}
                          </Link>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <Link
                    to={menu.ruta || '#'}
                    className={`flex items-center px-4 py-3 text-base font-semibold rounded-lg transition-colors
                      ${location.pathname === menu.ruta ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <DynamicIcon name={menu.icono} className="w-5 h-5 mr-3" />
                    {menu.nombre}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
