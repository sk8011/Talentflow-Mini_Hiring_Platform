# Quick Setup Guide

## Installation Steps

1. **Navigate to the frontend directory:**
```bash
cd frontend
```

2. **Install all dependencies:**
```bash
npm install
```

This will install all the new UI dependencies including:
- TailwindCSS 3.3.6
- Lucide React (icons)
- clsx & tailwind-merge (utility functions)
- class-variance-authority (component variants)

3. **Start the development server:**
```bash
npm run dev
```

4. **Open your browser:**
Navigate to `http://localhost:5173` (or the port shown in terminal)

## What's New?

### Modern UI Components
- Beautiful navigation bar with icons
- Professional landing page with gradient text
- Modern forms with styled inputs
- Toast notifications with icons
- Dark mode support

### Key Features
- **Sticky Navigation** - Always accessible header with backdrop blur
- **Theme Toggle** - Switch between light and dark modes
- **Icon Library** - Lucide React icons throughout the app
- **Responsive Design** - Optimized for desktop viewing
- **Smooth Animations** - Fade-in and slide-in effects

### Updated Pages
- ✅ Landing Page - Hero section with feature cards
- ✅ Jobs Page - Modern toolbar and pagination
- ✅ Candidates Page - Enhanced filters and bulk actions
- ✅ Kanban Board - Clean header design
- ✅ Toast Notifications - Icon-based alerts

## Troubleshooting

### CSS Warnings
You may see warnings about `@tailwind` and `@apply` directives in your IDE. These are expected and will be processed correctly by Tailwind/PostCSS when the app runs.

### Dependencies Not Installing
If you encounter issues with npm install:
1. Delete `node_modules` folder
2. Delete `package-lock.json`
3. Run `npm install` again

### Port Already in Use
If port 5173 is busy:
- Vite will automatically try the next available port
- Or you can specify a port: `npm run dev -- --port 3000`

## Next Steps

After setup, explore:
1. Toggle between light and dark themes
2. Navigate through different sections
3. Try creating jobs and candidates
4. Test the Kanban board drag-and-drop
5. View toast notifications on actions

Enjoy your modernized TalentFlow application! 🚀
