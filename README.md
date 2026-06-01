# Twimu ERP 🛒

**Twimu ERP** is a modern, high-performance Supermarket Management System designed to handle multi-branch retail networks. It offers a beautiful, responsive, and robust interface built with best-in-class web technologies.

![Twimu ERP Preview](public/supermarkets-bg.jpg)

## Features

- **Role-Based Access Control (RBAC):** Distinct experiences for **Directors (Admins)** and **Branch Managers**.
- **Multi-Branch Support:** Easily manage network-wide analytics or drill down into specific supermarket branches.
- **Financial Dashboard:** Real-time 14-day financial trend tracking, summarizing sales and expenses via interactive charts.
- **Salaries & HR:** Integrated employee and payroll management tracking (pending vs paid states).
- **Inventory & Stock Management:** Track items on a per-branch basis.
- **Audit Logs:** Monitor actions and system changes transparently.
- **Beautiful UI/UX:** Powered by Tailwind CSS, Radix UI primitives, glassmorphism aesthetics, and custom pastel glows.

## Tech Stack

- **Frontend Framework:** React 19 + Vite
- **Routing:** TanStack Router (File-based routing)
- **Styling:** Tailwind CSS v4 + `tailwind-merge` + `clsx`
- **Components:** Radix UI primitives + custom design system
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **Backend/Database:** Supabase (PostgreSQL + Row Level Security)
- **Auth:** Supabase Auth

## Getting Started

### Prerequisites

Ensure you have Node.js and a package manager (`npm`, `yarn`, or `bun`) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/musiimentaabraham02-blip/suppermarket.git
   cd suppermarket
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`.

## Deployment

The application is fully optimized for edge and serverless deployments (e.g., Cloudflare Pages, Vercel, or Netlify). To build the production bundle, run:

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential. Unauthorized copying or distribution of this codebase is strictly prohibited.
