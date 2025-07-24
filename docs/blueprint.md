# **App Name**: AutoReturns

## Core Features:

- Dashboard: Dashboard with quick access cards for returns and warranties.
- Data Management: Management interface for clients/mechanics, suppliers, and parts.
- Record Returns: Interface to record part returns, including quantity, client/mechanic details, and sales request information.
- Record Warranty: Interface to record warranty requests, including defect details, sales information, and supplier information.
- Search and Export: Unified interface for searching both returns and warranties with detailed filters and export functionality.
- Generate Reports: Report generation based on system data for returns, warranties, client history, and part movements. Printable format available.

## Style Guidelines:

- Primary color: Facebook Blue (#1877F2) for main buttons, links, and highlight icons.
- Background color: Light gray (#F0F2F5) for sections and cards in light mode, offering a clean interface.
- Accent color: Green (#2E8A57) to indicate success for indicators like 'Returns this Month'.
- Font: 'Inter', a grotesque-style sans-serif, for both headlines and body text to provide a modern, objective look. If this choice does not prove versatile, we can opt for a font pairing, but let's begin with one font for now.
- Clean, modern layout with good usability on desktops and mobile devices (responsive).
- Implement a selector (sun/moon icon) in the application header to switch between Light Mode and Dark Mode. The user's preference is saved locally (localStorage) so that the chosen theme persists when reloading the page.