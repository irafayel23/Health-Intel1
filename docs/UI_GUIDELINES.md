# UI & Styling Guidelines

## Visual Language
- **Soft UI Aesthetic**: Utilize large, subtle drop shadows (`shadow-soft`), rounded cards, and clean typography.
- **Typography**: Inter / Poppins fonts.
- **Icons**: Lucide Icons.

## Role-Based Theming
Strictly adhere to the following color palettes based on the logged-in user's role:
- **BHW (Barangay Health Worker)**: Soft Indigo theme.
- **MHO (Municipal Health Officer)**: Royal Iris / Mint theme.
- **Admins**: Deep Slate theme.

## CSS Rules
- **Tailwind Exclusive**: Enforce the separation of concerns. Use Tailwind CSS utility classes exclusively for styling.
- **No Inline Styles**: Absolutely do not use inline `<style>` tags or HTML `style=""` attributes unless completely unavoidable for dynamic JS geometry.

## DOM Manipulation Rules
> [!IMPORTANT]
> **Do not remove or alter existing HTML `id` attributes or `onclick` triggers.** 
> Core JavaScript functions heavily depend on these exact selectors. Modifying them will break the Vanilla JS application flow.
