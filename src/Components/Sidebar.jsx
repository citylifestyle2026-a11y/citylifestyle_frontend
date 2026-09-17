import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import {
  MdDashboard,
  MdClose,
  MdKeyboardArrowDown,
} from 'react-icons/md';

import { FaUsers, FaAddressBook } from 'react-icons/fa';

import {
  BsCalendarEventFill,
  BsFillTicketFill,
} from 'react-icons/bs';

import { FaFlag } from 'react-icons/fa6';

import '../assets/CSS/Sidebar.css';
import cityLifestyleLogo from '../assets/branding/city-lifestyle-logo.jpg';

const menuItems = [
  {
    label: 'Dashboard',
    icon: <MdDashboard />,
    path: '/dashboard',
  },
  {
    label: 'User Management',
    icon: <FaUsers />,
    submenu: [
      { label: 'Users', path: '/user' },
      { label: 'Roles', path: '/role' },
      // { label: 'Permissions', path: '/permission' },
      { label: 'Admins', path: '/admin' },
    ],
  },
  {
    label: 'Add Event',
    icon: <BsCalendarEventFill />,
    path: '/event',
  },
  {
    label: 'Booking',
    icon: <BsFillTicketFill />,
    path: '/booking',
  },
  {
    label: 'Contact List',
    icon: <FaAddressBook />,
    submenu: [
      // Admin Contact List lives at /contact-list — '/contact' is the
      // PUBLIC marketing contact page (see App.jsx) and must stay that
      // way.
      { label: 'Contact List', path: '/contact-list' },
      { label: 'Company Category', path: '/company-categories' },
    ],
  },
  {
    label: 'Entry Report',
    icon: <FaFlag />,
    path: '/entry-report',
  },
];

export default function Sidebar() {
  const location = useLocation();

  // Current user/role/permissions — prefer the live profile (from
  // getProfile()), fall back to the user cached at login (available
  // immediately on refresh, before getProfile() resolves).
  //
  // IMPORTANT: role/permissions are resolved field-by-field, not by
  // picking `profile` OR `authUser` wholesale. `/auth/profile` serves
  // Admin and Checker/User from two different backend models — if that
  // response ever omits or differently-shapes `role`/`permissions` for
  // one of them, an all-or-nothing `profile || authUser` would silently
  // lose a value that `authUser` (set correctly at login) still has,
  // e.g. right after getProfile() resolves. Falling back per-field means
  // a gap in one response can't blank out a value the other already has.
  const profile = useSelector((state) => state.auth.profile);
  const authUser = useSelector((state) => state.auth.user);
  const currentUser = profile || authUser;
  const role = profile?.role ?? authUser?.role;
  const userPermissions = Array.isArray(profile?.permissions)
    ? profile.permissions
    : Array.isArray(authUser?.permissions)
    ? authUser.permissions
    : [];

  const hasPermission = (permission) =>
    role === 'admin' || userPermissions.includes(permission);

  // Checker is locked to Entry Report ONLY — Dashboard, Event, Booking,
  // User Management (Users/Roles), and any future module are all hidden
  // for this role, regardless of what's added to `menuItems` later.
  // Non-checker roles (currently just Admin) keep the existing behavior
  // unchanged, including the Entry Report permission gate below.
  const isChecker = role === 'checker';

  const visibleMenuItems = menuItems.filter((item) => {
    if (isChecker) {
      return item.label === 'Entry Report' && hasPermission('Entry Report');
    }

    if (item.label === 'Entry Report') {
      return hasPermission('Entry Report');
    }

    return true;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);

  const closeSidebar = () => setIsOpen(false);

  const toggleSubmenu = (label) => {
    setExpandedMenu((prev) => (prev === label ? null : label));
  };

  // Toggle sidebar from header button
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);

    window.addEventListener('toggle-sidebar', handleToggle);

    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle);
    };
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Prevent body scroll when sidebar open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`overlay ${isOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className='sidebarHeader'>
          <div className='logoWrap'>
            <img
              src={cityLifestyleLogo}
              alt='City Lifestyle'
              className='logoIcon'
            />
            <div className='logoText'>
              <span className='logoShubh'>City</span>
              <span className='logoHindi'>LifeStyle</span>
            </div>
          </div>

          <button
            type='button'
            className='closeButton'
            onClick={closeSidebar}
            aria-label='Close sidebar'
          >
            <MdClose />
          </button>
        </div>

        {/* Navigation */}
        <nav className='nav'>
          {visibleMenuItems.map((item) => {
            // =========================
            // SUBMENU ITEM
            // =========================
            if (item.submenu) {
              // Check if current route belongs to submenu
              const hasActiveSubmenu = item.submenu.some(
                (sub) => location.pathname === sub.path
              );

              // Open dropdown when clicked OR when route is active
              const isExpanded =
                expandedMenu === item.label || hasActiveSubmenu;

              return (
                <div key={item.label}>
                  <button
                    type='button'
                    className='navItem'
                    onClick={() => toggleSubmenu(item.label)}
                  >
                    <span className='icon'>{item.icon}</span>
                    <span className='label'>{item.label}</span>

                    <span
                      className={`chevron ${
                        isExpanded ? 'rotated' : ''
                      }`}
                    >
                      <MdKeyboardArrowDown />
                    </span>
                  </button>

                  {/* Submenu */}
                  <div
                    className={`submenuWrapper ${
                      isExpanded ? 'expanded' : ''
                    }`}
                  >
                    <div className='submenuInner'>
                      <div className='submenu'>
                        {item.submenu.map((subItem) => (
                          <NavLink
                            key={subItem.label}
                            to={subItem.path}
                            className={({ isActive }) =>
                              `submenuItem ${isActive ? 'active' : ''}`
                            }
                            onClick={closeSidebar}
                          >
                            <span className='submenuDash'>-</span>
                            <span>{subItem.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // =========================
            // NORMAL MENU ITEM
            // =========================
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  `navItem ${isActive ? 'active' : ''}`
                }
                onClick={closeSidebar}
              >
                <span className='icon'>{item.icon}</span>
                <span className='label'>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}