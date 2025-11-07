/**
 * CMG Financial Branding Constants
 * Scraped from https://www.cmgfi.com
 */

export const CMG_BRANDING = {
  logo: {
    url: 'https://res.cloudinary.com/dvbdysuf5/image/upload/CMG_Web_Resources/Navigation_Images/cmg-logo.svg',
    alt: 'CMG Financial',
  },
  company: {
    name: 'CMG Financial',
    tagline: 'Home Loans Simplified',
    nmls: '1820',
    address: '3160 Crow Canyon Road Suite 400, San Ramon, CA 94583',
    phone: '1-800-501-2001',
    website: 'https://www.cmgfi.com',
  },
  colors: {
    // CMG brand colors (green is primary brand color)
    primary: '#9bc53d', // CMG green
    secondary: '#003057', // Navy blue
    accent: '#f7931e', // Orange
    text: '#333333',
    lightGray: '#f5f5f5',
    darkGray: '#666666',
  },
  socialMedia: {
    twitter: 'https://twitter.com/cmg_homeloans',
    facebook: 'https://www.facebook.com/CMGFinancial/',
    linkedin: 'https://www.linkedin.com/company/cmg-financial-services',
    instagram: 'https://www.instagram.com/cmghomeloans/',
  },
  legal: {
    equalHousing: 'Equal Housing Opportunity',
    nmls: 'NMLS #1820',
    licensing: 'Licensed in all 50 states plus territories',
  },
} as const;
