import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    document.title = `BUKKi - ${t('privacyPolicyTitle')}`;
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('privacyPolicyTitle')}</h1>
          <p className="text-gray-600 mb-8">{t('lastUpdated')}: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection1Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection1Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection2Title')}</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">{t('privacySection2Sub1')}</h3>
              <p className="text-gray-700 mb-4">
                {t('privacySection2Sub1Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('privacySection2Sub1Item1')}</li>
                <li>{t('privacySection2Sub1Item2')}</li>
                <li>{t('privacySection2Sub1Item3')}</li>
                <li>{t('privacySection2Sub1Item4')}</li>
                <li>{t('privacySection2Sub1Item5')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">{t('privacySection2Sub2')}</h3>
              <p className="text-gray-700 mb-4">
                {t('privacySection2Sub2Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('privacySection2Sub2Item1')}</li>
                <li>{t('privacySection2Sub2Item2')}</li>
                <li>{t('privacySection2Sub2Item3')}</li>
                <li>{t('privacySection2Sub2Item4')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">{t('privacySection2Sub3')}</h3>
              <p className="text-gray-700 mb-4">
                {t('privacySection2Sub3Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('privacySection2Sub3Item1')}</li>
                <li>{t('privacySection2Sub3Item2')}</li>
                <li>{t('privacySection2Sub3Item3')}</li>
                <li>{t('privacySection2Sub3Item4')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection3Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection3Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('privacySection3Item1')}</li>
                <li>{t('privacySection3Item2')}</li>
                <li>{t('privacySection3Item3')}</li>
                <li>{t('privacySection3Item4')}</li>
                <li>{t('privacySection3Item5')}</li>
                <li>{t('privacySection3Item6')}</li>
                <li>{t('privacySection3Item7')}</li>
                <li>{t('privacySection3Item8')}</li>
                <li>{t('privacySection3Item9')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection4Title')}</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">{t('privacySection4Sub1')}</h3>
              <p className="text-gray-700 mb-4">
                {t('privacySection4Sub1Content')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">{t('privacySection4Sub2')}</h3>
              <p className="text-gray-700 mb-4">
                {t('privacySection4Sub2Content')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">{t('privacySection4Sub3')}</h3>
              <p className="text-gray-700 mb-4">
                {t('privacySection4Sub3Content')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">{t('privacySection4Sub4')}</h3>
              <p className="text-gray-700 mb-4">
                {t('privacySection4Sub4Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection5Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection5Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('privacySection5Item1')}</li>
                <li>{t('privacySection5Item2')}</li>
                <li>{t('privacySection5Item3')}</li>
                <li>{t('privacySection5Item4')}</li>
                <li>{t('privacySection5Item5')}</li>
              </ul>
              <p className="text-gray-700 mb-4">
                {t('privacySection5Note')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection6Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection6Content')}
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>{t('privacySection6Item1')}</li>
                <li>{t('privacySection6Item2')}</li>
                <li>{t('privacySection6Item3')}</li>
                <li>{t('privacySection6Item4')}</li>
                <li>{t('privacySection6Item5')}</li>
                <li>{t('privacySection6Item6')}</li>
                <li>{t('privacySection6Item7')}</li>
              </ul>
              <p className="text-gray-700 mb-4">
                {t('privacySection6Note')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection7Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection7Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection8Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection8Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection9Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection9Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection10Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection10Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection11Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection11Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection12Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection12Content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacySection13Title')}</h2>
              <p className="text-gray-700 mb-4">
                {t('privacySection13Content')}
              </p>
            </section>

            <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>{t('privacyLegalNote').split(':')[0]}:</strong> {t('privacyLegalNote').split(':').slice(1).join(':')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
