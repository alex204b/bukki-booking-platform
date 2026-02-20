import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, MapPin, Star, Shield, QrCode, Users, Calendar,
  ChevronRight, Check, ArrowRight, Globe, Zap, Clock,
  Smartphone, Building2, Search, MessageSquare
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'ro' | 'ru'>('en');

  const t = {
    en: {
      nav_login: 'Log In',
      nav_register: 'Get Started',
      hero_title: 'Book Any Local Service',
      hero_title2: 'in Seconds',
      hero_sub: 'BUKKi centralizes all your local bookings — salons, mechanics, restaurants, clinics — in one AI-powered platform.',
      hero_cta: 'Start Booking Free',
      hero_cta2: 'For Businesses',
      hero_badge: 'AI-Powered',
      how_title: 'How It Works',
      how_sub: 'Three simple steps to book any local service',
      step1_title: 'Search with AI',
      step1_desc: 'Type naturally — "I need a haircut then lunch in Bucharest" — and our AI builds you a complete plan.',
      step2_title: 'Choose & Book',
      step2_desc: 'Pick from top-rated local businesses. See reviews, prices, and availability in real time.',
      step3_title: 'Show Up & Enjoy',
      step3_desc: 'Get a QR code for check-in. No paperwork, no waiting — just a seamless experience.',
      feat_title: 'Everything in One Platform',
      feat_sub: 'Built for customers and businesses alike',
      f1_title: 'AI Smart Search',
      f1_desc: 'Natural language queries that understand context, location, and multi-step plans.',
      f2_title: 'Real-Time Booking',
      f2_desc: 'Instant confirmation, live availability, and automated reminders.',
      f3_title: 'QR Check-In',
      f3_desc: 'Scan on arrival. No manual check-in needed for businesses or customers.',
      f4_title: 'Verified Reviews',
      f4_desc: 'Authentic ratings with a Trust Score system that rewards responsible users.',
      f5_title: 'Multi-Language',
      f5_desc: 'Full support for Romanian, English, and Russian — for Moldova and Romania.',
      f6_title: 'Business Dashboard',
      f6_desc: 'Analytics, team management, bookings calendar, and promotional offers.',
      biz_title: 'Grow Your Business with BUKKi',
      biz_sub: 'Join hundreds of local businesses already managing bookings smarter',
      biz_1: 'Get discovered by new customers in your city',
      biz_2: 'Manage all bookings from one dashboard',
      biz_3: 'Invite team members and assign bookings',
      biz_4: 'Run promotions and track revenue',
      biz_5: 'Reduce no-shows with automated reminders',
      biz_cta: 'List Your Business',
      stats_businesses: 'Businesses',
      stats_bookings: 'Bookings',
      stats_cities: 'Cities',
      stats_rating: 'Avg. Rating',
      cat_title: 'All Services, One App',
      footer_desc: 'Your trusted platform for booking local services across Moldova and Romania.',
      footer_links: 'Quick Links',
      footer_legal: 'Legal',
      footer_contact: 'Contact',
      footer_copy: '© 2026 BUKKi. All rights reserved.',
    },
    ro: {
      nav_login: 'Autentificare',
      nav_register: 'Înregistrează-te',
      hero_title: 'Rezervă Orice Serviciu Local',
      hero_title2: 'în Câteva Secunde',
      hero_sub: 'BUKKi centralizează toate rezervările tale locale — saloane, mecanici, restaurante, clinici — într-o singură platformă cu AI.',
      hero_cta: 'Începe Gratuit',
      hero_cta2: 'Pentru Afaceri',
      hero_badge: 'Bazat pe AI',
      how_title: 'Cum Funcționează',
      how_sub: 'Trei pași simpli pentru a rezerva orice serviciu local',
      step1_title: 'Caută cu AI',
      step1_desc: 'Scrie natural — "Am nevoie de tunsoare și după ceva de mâncat în Chișinău" — și AI-ul îți face un plan complet.',
      step2_title: 'Alege și Rezervă',
      step2_desc: 'Alege din cele mai bine cotate afaceri locale. Vezi recenzii, prețuri și disponibilitate în timp real.',
      step3_title: 'Prezintă-te și Bucură-te',
      step3_desc: 'Primești un cod QR pentru check-in. Fără hârtii, fără așteptare.',
      feat_title: 'Tot într-o Singură Platformă',
      feat_sub: 'Construită pentru clienți și afaceri deopotrivă',
      f1_title: 'Căutare AI Inteligentă',
      f1_desc: 'Înțelege contextul, locația și planurile în mai mulți pași.',
      f2_title: 'Rezervare în Timp Real',
      f2_desc: 'Confirmare instantă, disponibilitate live și mementouri automate.',
      f3_title: 'Check-In prin QR',
      f3_desc: 'Scanează la sosire. Fără check-in manual.',
      f4_title: 'Recenzii Verificate',
      f4_desc: 'Evaluări autentice cu un sistem Trust Score care recompensează utilizatorii responsabili.',
      f5_title: 'Multilingv',
      f5_desc: 'Suport complet pentru română, engleză și rusă.',
      f6_title: 'Panou de Control',
      f6_desc: 'Analize, gestionarea echipei, calendar rezervări și oferte promoționale.',
      biz_title: 'Crește-ți Afacerea cu BUKKi',
      biz_sub: 'Alătură-te sutelor de afaceri locale care gestionează rezervările mai inteligent',
      biz_1: 'Fii descoperit de clienți noi din orașul tău',
      biz_2: 'Gestionează toate rezervările dintr-un singur panou',
      biz_3: 'Invită membri ai echipei și atribuie rezervări',
      biz_4: 'Rulează promoții și urmărește veniturile',
      biz_5: 'Reduce neprezentările cu mementouri automate',
      biz_cta: 'Înregistrează Afacerea',
      stats_businesses: 'Afaceri',
      stats_bookings: 'Rezervări',
      stats_cities: 'Orașe',
      stats_rating: 'Rating Mediu',
      cat_title: 'Toate Serviciile, o Singură Aplicație',
      footer_desc: 'Platforma ta de încredere pentru rezervarea serviciilor locale din Moldova și România.',
      footer_links: 'Link-uri Rapide',
      footer_legal: 'Legal',
      footer_contact: 'Contact',
      footer_copy: '© 2026 BUKKi. Toate drepturile rezervate.',
    },
    ru: {
      nav_login: 'Войти',
      nav_register: 'Начать',
      hero_title: 'Запишитесь на любую',
      hero_title2: 'местную услугу за секунды',
      hero_sub: 'BUKKi объединяет все ваши записи — салоны, автосервисы, рестораны, клиники — в одной платформе с ИИ.',
      hero_cta: 'Начать бесплатно',
      hero_cta2: 'Для бизнеса',
      hero_badge: 'На основе ИИ',
      how_title: 'Как это работает',
      how_sub: 'Три простых шага для записи на любую услугу',
      step1_title: 'Поиск с ИИ',
      step1_desc: 'Пишите естественно — "Нужна стрижка, потом поесть в Кишинёве" — и ИИ составит полный план.',
      step2_title: 'Выберите и запишитесь',
      step2_desc: 'Выбирайте из лучших местных заведений. Отзывы, цены и доступность в реальном времени.',
      step3_title: 'Приходите и наслаждайтесь',
      step3_desc: 'Получите QR-код для регистрации. Никаких бумаг и ожидания.',
      feat_title: 'Всё в одной платформе',
      feat_sub: 'Создано для клиентов и бизнеса',
      f1_title: 'Умный поиск с ИИ',
      f1_desc: 'Понимает контекст, местоположение и многоэтапные планы.',
      f2_title: 'Бронирование в реальном времени',
      f2_desc: 'Мгновенное подтверждение, живая доступность и автоматические напоминания.',
      f3_title: 'QR-регистрация',
      f3_desc: 'Сканируйте при входе. Никакой ручной регистрации.',
      f4_title: 'Проверенные отзывы',
      f4_desc: 'Подлинные оценки с системой Trust Score.',
      f5_title: 'Многоязычность',
      f5_desc: 'Полная поддержка румынского, английского и русского языков.',
      f6_title: 'Панель управления',
      f6_desc: 'Аналитика, управление командой, календарь и акции.',
      biz_title: 'Развивайте бизнес с BUKKi',
      biz_sub: 'Присоединяйтесь к сотням местных предприятий',
      biz_1: 'Привлекайте новых клиентов в вашем городе',
      biz_2: 'Управляйте всеми записями из одной панели',
      biz_3: 'Приглашайте сотрудников и назначайте записи',
      biz_4: 'Запускайте акции и отслеживайте доходы',
      biz_5: 'Сократите неявки с автоматическими напоминаниями',
      biz_cta: 'Добавить бизнес',
      stats_businesses: 'Бизнесов',
      stats_bookings: 'Записей',
      stats_cities: 'Городов',
      stats_rating: 'Средний рейтинг',
      cat_title: 'Все услуги в одном приложении',
      footer_desc: 'Ваша надёжная платформа для записи на местные услуги в Молдове и Румынии.',
      footer_links: 'Ссылки',
      footer_legal: 'Правовая информация',
      footer_contact: 'Контакт',
      footer_copy: '© 2026 BUKKi. Все права защищены.',
    },
  };

  const tx = t[lang];

  const categories = [
    { label: lang === 'ro' ? 'Saloane & Coafură' : lang === 'ru' ? 'Салоны' : 'Beauty & Hair' },
    { label: lang === 'ro' ? 'Mecanici' : lang === 'ru' ? 'Автосервис' : 'Mechanics' },
    { label: lang === 'ro' ? 'Restaurante' : lang === 'ru' ? 'Рестораны' : 'Restaurants' },
    { label: lang === 'ro' ? 'Sănătate' : lang === 'ru' ? 'Здоровье' : 'Healthcare' },
    { label: lang === 'ro' ? 'Fitness' : lang === 'ru' ? 'Фитнес' : 'Fitness' },
    { label: lang === 'ro' ? 'Croitori' : lang === 'ru' ? 'Портные' : 'Tailors' },
    { label: lang === 'ro' ? 'Altceva?' : lang === 'ru' ? 'Что-то ещё?' : 'Anything else?', highlight: true },
  ];

  const features = [
    { icon: <Sparkles className="h-6 w-6" />, title: tx.f1_title, desc: tx.f1_desc },
    { icon: <Calendar className="h-6 w-6" />, title: tx.f2_title, desc: tx.f2_desc },
    { icon: <QrCode className="h-6 w-6" />, title: tx.f3_title, desc: tx.f3_desc },
    { icon: <Star className="h-6 w-6" />, title: tx.f4_title, desc: tx.f4_desc },
    { icon: <Globe className="h-6 w-6" />, title: tx.f5_title, desc: tx.f5_desc },
    { icon: <Zap className="h-6 w-6" />, title: tx.f6_title, desc: tx.f6_desc },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-[#330007]">BUK</span><span className="text-[#E7001E]">Ki</span>
          </span>

          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <div className="hidden sm:flex items-center gap-1 text-xs font-medium text-gray-500">
              {(['ro', 'en', 'ru'] as const).map((l, i) => (
                <React.Fragment key={l}>
                  {i > 0 && <span className="text-gray-300">|</span>}
                  <button
                    onClick={() => setLang(l)}
                    className={`px-1 py-0.5 rounded transition-colors ${lang === l ? 'text-[#E7001E] font-bold' : 'hover:text-[#330007]'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-[#E7001E] transition-colors px-3 py-1.5">
              {tx.nav_login}
            </Link>
            <Link to="/login?signup=true" className="text-sm font-semibold bg-[#E7001E] text-white px-4 py-2 rounded-lg hover:bg-[#330007] transition-colors shadow-sm">
              {tx.nav_register}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#330007] via-[#4a000a] to-[#1a0004] text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ width: Math.random() * 6 + 2, height: Math.random() * 6 + 2, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: Math.random() * 0.5 + 0.2 }} />
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#E7001E]" />
              {tx.hero_badge}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-4">
              {tx.hero_title}<br />
              <span className="text-[#E7001E]">{tx.hero_title2}</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-xl leading-relaxed">
              {tx.hero_sub}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/login?signup=true" className="inline-flex items-center gap-2 bg-[#E7001E] hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                {tx.hero_cta} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login?signup=true" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-6 py-3 rounded-xl transition-all backdrop-blur">
                <Building2 className="h-4 w-4" /> {tx.hero_cta2}
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-10 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">{tx.cat_title}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((c) => (
              <div key={c.label} className={`flex items-center bg-white border rounded-full px-4 py-2 text-sm font-medium shadow-sm ${c.highlight ? 'border-[#E7001E] text-[#E7001E]' : 'border-gray-200 text-gray-700'}`}>
                {c.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#330007] mb-3">{tx.how_title}</h2>
            <p className="text-gray-500 text-lg">{tx.how_sub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '1', icon: <Search className="h-8 w-8" />, title: tx.step1_title, desc: tx.step1_desc },
              { num: '2', icon: <Calendar className="h-8 w-8" />, title: tx.step2_title, desc: tx.step2_desc },
              { num: '3', icon: <QrCode className="h-8 w-8" />, title: tx.step3_title, desc: tx.step3_desc },
            ].map((step, i) => (
              <div key={i} className="relative text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200 z-0" />
                )}
                <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 bg-[#330007] text-white rounded-2xl mb-4 shadow-lg mx-auto">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#E7001E] text-white text-xs font-black rounded-full flex items-center justify-center">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI highlight ── */}
      <section className="py-16 bg-gradient-to-r from-[#330007] to-[#E7001E] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm mb-4">
              <Sparkles className="h-4 w-4" /> AI-Powered
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              {lang === 'ro' ? 'Caută în limbaj natural' : lang === 'ru' ? 'Поиск на естественном языке' : 'Search in natural language'}
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              {lang === 'ro'
                ? 'Spune-i AI-ului ce ai nevoie și el va găsi cele mai bune opțiuni din zona ta, creând un plan complet cu mai mulți pași.'
                : lang === 'ru'
                ? 'Скажите ИИ, что вам нужно, и он найдёт лучшие варианты рядом с вами, создав полный многоэтапный план.'
                : 'Tell the AI what you need and it will find the best options near you, building a complete multi-step plan.'}
            </p>
          </div>
          <div className="flex-shrink-0 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 w-full md:w-80">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="bg-white/20 rounded-lg p-3 text-white/90 italic">
                "{lang === 'ro' ? 'Am nevoie de tunsoare și după un restaurant în Chișinău' : lang === 'ru' ? 'Мне нужна стрижка, потом ресторан в Кишинёве' : 'I need a haircut then a restaurant in Chișinău'}"
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-[#E7001E] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-white/90 text-xs leading-relaxed flex-1">
                  {lang === 'ro' ? '✓ Plan creat: Pas 1 — Tunsoare, Pas 2 — Restaurant. Am găsit 3 saloane și 4 restaurante în Chișinău.' : lang === 'ru' ? '✓ План создан: Шаг 1 — Стрижка, Шаг 2 — Ресторан. Найдено 3 салона и 4 ресторана в Кишинёве.' : '✓ Plan created: Step 1 — Haircut, Step 2 — Restaurant. Found 3 salons and 4 restaurants in Chișinău.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#330007] mb-3">{tx.feat_title}</h2>
            <p className="text-gray-500 text-lg">{tx.feat_sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 bg-[#330007] text-white rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Businesses ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#330007] to-[#5a000d] rounded-3xl p-8 sm:p-12 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E7001E]/20 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm mb-4">
                  <Building2 className="h-4 w-4" />
                  {lang === 'ro' ? 'Pentru proprietari de afaceri' : lang === 'ru' ? 'Для владельцев бизнеса' : 'For business owners'}
                </div>
                <h2 className="text-3xl sm:text-4xl font-black mb-4">{tx.biz_title}</h2>
                <p className="text-white/70 mb-6">{tx.biz_sub}</p>
                <Link to="/login?signup=true" className="inline-flex items-center gap-2 bg-[#E7001E] hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg">
                  {tx.biz_cta} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <ul className="space-y-3">
                {[tx.biz_1, tx.biz_2, tx.biz_3, tx.biz_4, tx.biz_5].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-[#E7001E] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-white/90 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-black text-[#330007] mb-3">
            {lang === 'ro' ? 'Gata să începi?' : lang === 'ru' ? 'Готовы начать?' : 'Ready to get started?'}
          </h2>
          <p className="text-gray-500 mb-6">
            {lang === 'ro' ? 'Creează un cont gratuit și rezervă primul tău serviciu în mai puțin de un minut.' : lang === 'ru' ? 'Создайте бесплатный аккаунт и запишитесь на первую услугу менее чем за минуту.' : 'Create a free account and book your first service in under a minute.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login?signup=true" className="inline-flex items-center justify-center gap-2 bg-[#E7001E] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#330007] transition-colors shadow-lg">
              {tx.nav_register} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-700 font-semibold px-8 py-3 rounded-xl hover:border-[#E7001E] hover:text-[#E7001E] transition-colors">
              {tx.nav_login}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#330007] text-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <span className="text-2xl font-black">
                <span className="text-white">BUK</span><span className="text-[#E7001E]">Ki</span>
              </span>
              <p className="text-gray-400 text-sm mt-3 max-w-xs leading-relaxed">{tx.footer_desc}</p>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-sm uppercase tracking-wider text-gray-300">{tx.footer_links}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/login" className="hover:text-white transition-colors">{tx.nav_login}</Link></li>
                <li><Link to="/login?signup=true" className="hover:text-white transition-colors">{tx.nav_register}</Link></li>
                <li><Link to="/info" className="hover:text-white transition-colors">Info</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-sm uppercase tracking-wider text-gray-300">{tx.footer_legal}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/terms" className="hover:text-white transition-colors">{lang === 'ro' ? 'Termeni și condiții' : lang === 'ru' ? 'Условия использования' : 'Terms of Service'}</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">{lang === 'ro' ? 'Politica de confidențialitate' : lang === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy'}</Link></li>
              </ul>
              <h4 className="font-bold mt-4 mb-2 text-sm uppercase tracking-wider text-gray-300">{tx.footer_contact}</h4>
              <p className="text-sm text-gray-400">support@bukki.org</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-xs text-gray-500">
            {tx.footer_copy}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
