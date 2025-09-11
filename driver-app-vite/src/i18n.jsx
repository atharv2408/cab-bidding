import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          // Add translations here as needed
          welcome: 'Welcome to BidCab Driver',
          dashboard: 'Dashboard',
          availableRides: 'Available Rides',
          activeRides: 'Active Rides',
          earnings: 'Earnings',
          profile: 'Profile',
          history: 'History'
        }
      }
    }
  });

export default i18n;
