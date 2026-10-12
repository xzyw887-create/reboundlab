import type { LegalDocSection, LegalPageFooterCopy } from "./legalDocSection";
import type { Locale } from "./LocaleProvider";

export type PrivacyPageCopy = {
  metaTitle: string;
  title: string;
  subtitle: string;
  sections: LegalDocSection[];
  rightsHeading: string;
  rightsIntro: string;
  rightsOrHelp: string;
  sellerRefText: string;
  sellerRefLink: string;
} & LegalPageFooterCopy;

const ru: PrivacyPageCopy = {
  metaTitle: "Политика конфиденциальности — BackTest Pro",
  title: "Политика обработки персональных данных",
  subtitle:
    "BackTest Pro (backtestpro.ru) · действует для пользователей сайта и терминала",
  sections: [
    {
      heading: "1. Общие положения",
      paragraphs: [
        "1.1. Настоящая политика определяет порядок обработки и защиты персональных данных пользователей информационного сервиса BackTest Pro (далее — «Сервис») в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».",
        "1.2. Используя Сервис (в том числе нажимая «Войти через Telegram»), вы подтверждаете, что ознакомились с этой политикой. Условия доступа к Сервису — в пользовательском соглашении (оферте) на странице /terms.",
        "1.3. Сервис не предназначен для лиц младше 18 лет. Мы сознательно не собираем данные несовершеннолетних.",
      ],
    },
    {
      heading: "2. Оператор персональных данных",
      paragraphs: [
        "Оператор персональных данных совпадает с исполнителем по пользовательскому соглашению. ФИО, ИНН, статус самозанятого (НПД) и контакты — в оферте (/terms), блок «Исполнитель».",
        "Обращения по персональным данным: support@backtestpro.ru или /help.",
      ],
    },
    {
      heading: "3. Категории субъектов и данных",
      paragraphs: ["Обрабатываем данные зарегистрированных пользователей и посетителей сайта:"],
      items: [
        "идентификатор Telegram, имя и @username (если переданы виджетом Telegram Login);",
        "внутренний идентификатор аккаунта, служебный технический адрес в системе (не используется для входа по email);",
        "тариф, статус и срок подписки, история оплат (при подключении платёжной системы — без хранения полных данных банковской карты на наших серверах);",
        "параметры и сохранённые результаты бэктестов — если вы вошли в аккаунт и сохраняете прогоны;",
        "технические данные: IP-адрес, тип браузера и устройства, cookie сессии, журналы ошибок и безопасности.",
      ],
    },
    {
      heading: "4. Цели и правовые основания обработки",
      items: [
        "регистрация и вход через Telegram — исполнение договора (оферты) и ваше действие по инициированию входа (ст. 6 152-ФЗ);",
        "предоставление доступа по тарифу и пробному периоду — исполнение договора;",
        "приём оплаты и учёт подписки — исполнение договора и обязанности оператора по закону о налогах (для самозанятого);",
        "поддержка пользователей и ответ на обращения — законный интерес / исполнение договора;",
        "обеспечение безопасности, предотвращение злоупотреблений — законный интерес оператора;",
        "улучшение Сервиса на обезличенных или агрегированных данных — законный интерес (без профилирования для рекламы третьим лицам).",
      ],
    },
    {
      heading: "5. Cookies и локальное хранение",
      paragraphs: [
        "Мы используем необходимые cookie для сессии после входа. В гостевом режиме часть настроек терминала может храниться только в вашем браузере (localStorage) и не отправляется на сервер, пока вы не войдёте и не сохраните прогон в аккаунте.",
        "Маркетинговые и рекламные cookie третьих лиц на сайте не используются. При подключении веб-аналитики этот раздел будет дополнен.",
      ],
    },
    {
      heading: "6. Сроки хранения и уничтожение",
      items: [
        "данные аккаунта и прогонов — пока аккаунт активен; после вашего запроса на удаление — в разумный срок, обычно не более 30 календарных дней, если иное не требуется законом;",
        "данные о платежах и подписке — в сроки, установленные налоговым и бухгалтерским законодательством РФ (как правило, не менее 4–5 лет с даты операции);",
        "технические журналы — как правило, до 12 месяцев, если более длительный срок не нужен для расследования инцидента безопасности.",
      ],
      paragraphs: [
        "По достижении целей обработки или истечении сроков данные удаляются или обезличиваются.",
      ],
    },
    {
      heading: "7. Передача третьим лицам и трансграничная передача",
      paragraphs: [
        "Для работы Сервиса привлекаются обработчики (по поручению оператора): хостинг-провайдер, облачная база данных PostgreSQL, платёжный агрегатор (ЮKassa — при подключении). С ними заключаются договоры или применяются их публичные условия обработки данных.",
        "Вход через Telegram выполняется с участием Telegram Messenger Inc. / связанных лиц. Нажимая кнопку входа, вы инициируете передачу данных, необходимых для авторизации, оператору Telegram; обработка может осуществляться за пределами РФ. Мы получаем от виджета только данные, перечисленные в разделе 3.",
        "Данные банковских карт обрабатывает платёжный провайдер; мы не храним полные реквизиты карты.",
      ],
    },
    {
      heading: "8. Меры защиты персональных данных",
      paragraphs: [
        "Применяются организационные и технические меры: ограничение доступа к базе данных, шифрование каналов (HTTPS), хранение паролей не актуально для входа через Telegram; сессии защищены httpOnly-cookie. Уровень защиты информационной системы определяется исходя из актуальных угроз и требований постановления Правительства РФ № 1119 (для ИСПДн).",
      ],
    },
    {
      heading: "9. Права субъекта персональных данных",
      items: [
        "получить сведения об обработке ваших данных;",
        "требовать уточнения, блокирования или уничтожения данных, если они неполные, устаревшие или обрабатываются незаконно;",
        "отозвать согласие (если обработка основана на согласии) — при этом может стать невозможным пользоваться Сервисом;",
        "обжаловать действия оператора в Роскомнадзор или в суд.",
      ],
      paragraphs: [
        "Запрос направляйте на email оператора с темой «Персональные данные» и указанием вашего Telegram @username или id аккаунта в Сервисе. Срок ответа — до 30 дней, если иной срок не установлен законом.",
      ],
    },
    {
      heading: "10. Изменение политики",
      paragraphs: [
        "Мы можем обновлять политику при изменении функций Сервиса или законодательства. Актуальная версия всегда на этой странице; дата обновления указана ниже. При существенных изменениях можем дополнительно уведомить через сайт или Telegram-канал поддержки.",
      ],
    },
  ],
  rightsHeading: "Обращения",
  rightsIntro: "Запросить доступ, исправление или удаление данных — ",
  rightsOrHelp: " или ",
  sellerRefText: "Полные реквизиты исполнителя и оператора — в",
  sellerRefLink: "пользовательском соглашении (блок «Исполнитель»)",
  updated: "Обновлено: 12 марта 2026",
};

const en: PrivacyPageCopy = {
  metaTitle: "Privacy Policy — BackTest Pro",
  title: "Personal Data Processing Policy",
  subtitle: "BackTest Pro (backtestpro.ru) · applies to website and terminal users",
  sections: [
    {
      heading: "1. General",
      paragraphs: [
        "1.1. This policy describes how BackTest Pro (the “Service”) processes personal data under applicable law (including Russian Federal Law No. 152-FZ where it applies to the operator).",
        "1.2. By using the Service (including “Continue with Telegram”), you acknowledge this policy. Service terms are in the Terms of Service at /terms.",
        "1.3. The Service is not directed at users under 18.",
      ],
    },
    {
      heading: "2. Data controller",
      paragraphs: [
        "The data controller is the same provider as in the Terms of Service (/terms), section “Provider”.",
        "Privacy requests: support@backtestpro.ru or /help.",
      ],
    },
    {
      heading: "3. Data we process",
      items: [
        "Telegram Login: user id, display name, @username (when shared with the widget);",
        "internal account id and a technical placeholder identifier (email/password sign-in is not offered);",
        "plan, subscription status and term, payment records (no full card data on our servers);",
        "backtest parameters and saved runs when you are signed in;",
        "technical data: IP, browser/device type, session cookies, security and error logs.",
      ],
    },
    {
      heading: "4. Purposes and legal bases",
      items: [
        "Telegram sign-in and account — contract performance and your initiation of login;",
        "plan and trial access — contract performance;",
        "payments and billing records — contract and legal tax obligations;",
        "support — contract / legitimate interest;",
        "security and abuse prevention — legitimate interest;",
        "product improvement on aggregated data — legitimate interest (no third-party ad profiling).",
      ],
    },
    {
      heading: "5. Cookies and local storage",
      paragraphs: [
        "We use essential cookies for signed-in sessions. In guest mode, some terminal settings may stay in your browser only until you sign in and save runs to your account.",
        "No third-party advertising cookies at this time. If analytics is added, this section will be updated.",
      ],
    },
    {
      heading: "6. Retention and deletion",
      items: [
        "account and saved runs — while the account is active; after a deletion request — usually within 30 days unless law requires longer;",
        "payment/subscription records — as required by tax/accounting rules;",
        "technical logs — typically up to 12 months unless needed for a security incident.",
      ],
    },
    {
      heading: "7. Processors and cross-border processing",
      paragraphs: [
        "Hosting, PostgreSQL database, and payment provider (YooKassa when connected) process data on our instructions.",
        "Telegram Login involves Telegram; by signing in you transfer auth data to Telegram, which may process it outside your country. We only receive the fields listed in section 3.",
        "Card data is handled by the payment provider.",
      ],
    },
    {
      heading: "8. Security",
      paragraphs: [
        "HTTPS, access controls, httpOnly session cookies, and other measures appropriate to the risk of the information system.",
      ],
    },
    {
      heading: "9. Your rights",
      items: [
        "access and information about processing;",
        "rectification, restriction, or deletion where applicable;",
        "withdraw consent where processing is consent-based (may limit use of the Service);",
        "complaint to a supervisory authority or court.",
      ],
      paragraphs: [
        "Contact us by email with subject “Personal data” and your Telegram @username or account id. We respond within a reasonable time (up to 30 days where 152-FZ applies).",
      ],
    },
    {
      heading: "10. Changes",
      paragraphs: [
        "We may update this policy; the current version is always on this page with the date below.",
      ],
    },
  ],
  rightsHeading: "Contact",
  rightsIntro: "Request access, correction, or deletion — ",
  rightsOrHelp: " or ",
  sellerRefText: "Full provider / data controller details — see",
  sellerRefLink: "Terms of Service (Provider section)",
  updated: "Updated: March 12, 2026",
};

export const privacyPageCopy: Record<Locale, PrivacyPageCopy> = { ru, en };
