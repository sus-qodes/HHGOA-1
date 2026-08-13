# Share-page asset contract

The final design team should provide versioned, licensed, sRGB assets:

- `og-background.png`: exactly `1200x630`, opaque PNG.
- `hhgoa-lockup.png`: transparent PNG sized for the agreed safe area.

The OG renderer will place the complete `1134x1926` card using `contain`; it must
never crop the card to fill the landscape canvas. Final coordinates and safe areas
will live in a versioned manifest beside the assets rather than in route code.

Until these files are provided, any generated background is temporary and must be
labelled as such in documentation.
