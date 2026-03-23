import { Outlet, NavLink } from 'react-router-dom'
import './Layout.css'

export function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            Market Insights
          </NavLink>
          <NavLink
            to="/documents"
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            Document Analysis
          </NavLink>
          <NavLink
            to="/financials"
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            Financial Report
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
