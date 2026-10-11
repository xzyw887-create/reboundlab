import type { Locale } from "./LocaleProvider";

type TermsCopy = {
  metaTitle: string;
  title: string;
  subtitle: string;
  intro: string;
  sellerHeading: string;
  sellerInnLabel: string;
  sellerChannels: string;
  subjectHeading: string;
  subjectBody: string;
  pricingHeading: string;
  pricingPlansIntro: string;
  pricingTrial: string;
  pricingPaid: string;
  pricingLinkLabel: string;
  deliveryHeading: string;
  deliveryBeforeApp: string;
  deliveryAfterApp: string;
  liabilityHeading: string;
  liabilityBody: string;
  liabilityNote: string;
  useHeading: string;
  useBody: string;
  updated: string;
};

type PrivacyCopy = {
  metaTitle: string;
  title: string;
  subtitle: string;
  intro: string;
  collectHeading: string;
  collectItems: string[];
  purposeHeading: string;
  purposeBody: string;
  thirdPartyHeading: string;
  thirdPartyBody: string;
  rightsHeading: string;
  rightsIntro: string;
  rightsOrHelp: string;
  updated: string;
};

export type LegalCopy = {
  terms: TermsCopy;
  privacy: PrivacyCopy;
};

export const legalCopy: Record<Locale, LegalCopy> = {
  ru: {
    terms: {
      metaTitle: "Пользовательское соглашение — BackTest Pro",
      title: "Пользовательское соглашение (оферта)",
      subtitle: "Условия доступа к сервису BackTest Pro",
      intro:
        "Настоящее соглашение является публичной офертой на оказание услуг по предоставлению доступа к информационному сервису BackTest Pro (далее — «Сервис») через сайт backtestpro.ru.",
      sellerHeading: "Исполнитель",
      sellerInnLabel: "ИНН",
      sellerChannels: "Все каналы связи:",
      subjectHeading: "Предмет услуги",
      subjectBody:
        "Сервис предоставляет инструменты для моделирования сделок на исторических рыночных данных (бэктест). Сервис не совершает сделки от имени пользователя и не управляет средствами пользователя.",
      pricingHeading: "Тарифы и оплата",
      pricingPlansIntro: "Актуальные цены и состав функций — на странице ",
      pricingTrial:
        "Пробный период — 3 календарных дня с момента регистрации (тариф «Пробный»), если доступен.",
      pricingPaid:
        "Платные тарифы Basic и Pro — подписка на срок, указанный при оплате. Способ оплаты и чек — через подключённую платёжную систему (например, ЮKassa).",
      pricingLinkLabel: "Тарифы",
      deliveryHeading: "Получение услуги",
      deliveryBeforeApp:
        "Услуга оказывается в электронном виде. После успешной оплаты (или активации пробного периода) доступ к функциям Сервиса предоставляется в личном кабинете на сайте — раздел «Калькулятор» / приложение по адресу ",
      deliveryAfterApp: ". Физическая доставка товаров не производится.",
      liabilityHeading: "Ограничение ответственности",
      liabilityBody:
        "BackTest Pro — информационный сервис. Результаты бэктеста получены на исторических данных и являются моделью; реальная торговля может отличаться (проскальзывание, ликвидность, изменение правил биржи). Материалы Сервиса",
      liabilityNote: "не являются инвестиционной рекомендацией",
      useHeading: "Использование сервиса",
      useBody:
        "Запрещены злоупотребления API, попытки обхода лимитов тарифа, передача доступа третьим лицам в нарушение тарифа и любое использование Сервиса с нарушением законодательства РФ.",
      updated: "Обновлено: 9 октября 2026",
    },
    privacy: {
      metaTitle: "Политика конфиденциальности — BackTest Pro",
      title: "Политика конфиденциальности",
      subtitle: "Черновик для beta · уточните с юристом перед масштабом",
      intro:
        "Мы обрабатываем email и хеш пароля для входа, данные подписки (тариф, срок) и технические логи (IP, браузер) для безопасности сервиса.",
      collectHeading: "Что собираем",
      collectItems: [
        "Email и пароль (пароль хранится в виде хеша)",
        "История подписки и использования тарифа",
        "Параметры бэктестов — только в рамках вашей сессии / сохранённых настроек браузера",
      ],
      purposeHeading: "Зачем",
      purposeBody: "Авторизация, выдача доступа по тарифу, поддержка и улучшение продукта.",
      thirdPartyHeading: "Передача третьим лицам",
      thirdPartyBody:
        "Хостинг, база данных (PostgreSQL), платёжный провайдер (ЮKassa — когда подключим). Данные карты не храним на своих серверах.",
      rightsHeading: "Ваши права",
      rightsIntro: "Запросить удаление аккаунта и данные — ",
      rightsOrHelp: " или ",
      updated: "Обновлено: июль 2026",
    },
  },
  en: {
    terms: {
      metaTitle: "Terms of Service — BackTest Pro",
      title: "Terms of Service",
      subtitle: "Access terms for BackTest Pro",
      intro:
        "This agreement is a public offer to provide access to the BackTest Pro information service (the “Service”) via backtestpro.ru.",
      sellerHeading: "Provider",
      sellerInnLabel: "Tax ID (INN)",
      sellerChannels: "All support channels:",
      subjectHeading: "Scope of service",
      subjectBody:
        "The Service provides tools to simulate trades on historical market data (backtesting). It does not execute trades on your behalf or manage your funds.",
      pricingHeading: "Plans and payment",
      pricingPlansIntro: "Current prices and features — on the ",
      pricingTrial:
        "Trial period — 3 calendar days from registration (Trial plan), when available.",
      pricingPaid:
        "Paid Basic and Pro plans — subscription for the term shown at checkout. Payment and receipts via the connected payment provider (e.g. YooKassa).",
      pricingLinkLabel: "Pricing",
      deliveryHeading: "Delivery of service",
      deliveryBeforeApp:
        "The Service is delivered electronically. After successful payment (or trial activation), access is granted in your account — the Calculator at ",
      deliveryAfterApp: ". No physical goods are shipped.",
      liabilityHeading: "Limitation of liability",
      liabilityBody:
        "BackTest Pro is an informational tool. Backtest results use historical data and are a model; live trading may differ (slippage, liquidity, exchange rule changes). Service materials are",
      liabilityNote: "not investment advice",
      useHeading: "Acceptable use",
      useBody:
        "Abuse of APIs, bypassing plan limits, sharing access against plan terms, or any unlawful use is prohibited.",
      updated: "Updated: October 9, 2026",
    },
    privacy: {
      metaTitle: "Privacy Policy — BackTest Pro",
      title: "Privacy Policy",
      subtitle: "Beta draft · review with legal counsel before scale",
      intro:
        "We process email and a password hash for sign-in, subscription data (plan, term), and technical logs (IP, browser) for security.",
      collectHeading: "What we collect",
      collectItems: [
        "Email and password (password stored as a hash)",
        "Subscription history and plan usage",
        "Backtest parameters — in your session / browser saved settings only",
      ],
      purposeHeading: "Why",
      purposeBody: "Authentication, plan access, support, and product improvement.",
      thirdPartyHeading: "Third parties",
      thirdPartyBody:
        "Hosting, database (PostgreSQL), payment provider (YooKassa when connected). We do not store card data on our servers.",
      rightsHeading: "Your rights",
      rightsIntro: "Request account deletion and your data — ",
      rightsOrHelp: " or ",
      updated: "Updated: July 2026",
    },
  },
};
