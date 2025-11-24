import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { ArrowLeft } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    document.title = `BUKKi - ${t('termsOfServiceTitle')}`;
    // Set favicon
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = '/logo.png';
    }
  }, [t]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-30 text-xs sm:text-sm text-gray-600 select-none">
        <button 
          type="button"
          className={`px-2 transition-colors ${lang === 'ro' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`} 
          onClick={() => setLang('ro')}
        >
          RO
        </button>
        <span className="px-1 text-gray-400">|</span>
        <button 
          type="button"
          className={`px-2 transition-colors ${lang === 'en' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`} 
          onClick={() => setLang('en')}
        >
          EN
        </button>
        <span className="px-1 text-gray-400">|</span>
        <button 
          type="button"
          className={`px-2 transition-colors ${lang === 'ru' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`} 
          onClick={() => setLang('ru')}
        >
          RU
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToLogin')}
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('termsOfServiceTitle')}</h1>
          <p className="text-gray-600 mb-8">{t('lastUpdated')}: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection1Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection1Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection2Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection2Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection3Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection3Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('termsSection3Item1')}</li>
                <li>{t('termsSection3Item2')}</li>
                <li>{t('termsSection3Item3')}</li>
                <li>{t('termsSection3Item4')}</li>
                <li>{t('termsSection3Item5')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection4Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection4Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('termsSection4Item1')}</li>
                <li>{t('termsSection4Item2')}</li>
                <li>{t('termsSection4Item3')}</li>
                <li>{t('termsSection4Item4')}</li>
                <li>{t('termsSection4Item5')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection5Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection5Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('termsSection5Item1')}</li>
                <li>{t('termsSection5Item2')}</li>
                <li>{t('termsSection5Item3')}</li>
                <li>{t('termsSection5Item4')}</li>
                <li>{t('termsSection5Item5')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection6Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection6Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('termsSection6Item1')}</li>
                <li>{t('termsSection6Item2')}</li>
                <li>{t('termsSection6Item3')}</li>
                <li>{t('termsSection6Item4')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection7Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection7Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('termsSection7Item1')}</li>
                <li>{t('termsSection7Item2')}</li>
                <li>{t('termsSection7Item3')}</li>
                <li>{t('termsSection7Item4')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection8Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection8Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('termsSection8Item1')}</li>
                <li>{t('termsSection8Item2')}</li>
                <li>{t('termsSection8Item3')}</li>
                <li>{t('termsSection8Item4')}</li>
                <li>{t('termsSection8Item5')}</li>
                <li>{t('termsSection8Item6')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection9Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection9Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection10Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection10Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('termsSection10Item1')}</li>
                <li>{t('termsSection10Item2')}</li>
                <li>{t('termsSection10Item3')}</li>
                <li>{t('termsSection10Item4')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection11Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection11Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection12Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection12Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('termsSection13Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('termsSection13Content')}
              </p>
            </section>

            <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>{t('termsLegalNote').split(':')[0]}:</strong> {t('termsLegalNote').split(':').slice(1).join(':')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
