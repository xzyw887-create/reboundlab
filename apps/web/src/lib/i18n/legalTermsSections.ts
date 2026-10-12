import { termsPricingTrialLine } from "@/lib/productPolicy";
import type { LegalDocSection, LegalPageFooterCopy } from "./legalDocSection";
import type { Locale } from "./LocaleProvider";

export type TermsPageCopy = {
  metaTitle: string;
  title: string;
  subtitle: string;
  sections: LegalDocSection[];
} & LegalPageFooterCopy & {
  sellerHeading: string;
  sellerInnLabel: string;
  sellerChannels: string;
};

const ru: TermsPageCopy = {
  metaTitle: "Пользовательское соглашение — BackTest Pro",
  title: "Пользовательское соглашение (публичная оферта)",
  subtitle: "BackTest Pro (backtestpro.ru) · доступ к информационному сервису бэктеста",
  sections: [
    {
      heading: "1. Общие положения",
      paragraphs: [
        "1.1. Настоящий документ — публичная оферта исполнителя на оказание услуг по предоставлению доступа к информационному сервису BackTest Pro (далее — «Сервис») через сайт backtestpro.ru.",
        "1.2. Акцепт оферты — регистрация и/или вход через Telegram, использование Сервиса, оплата тарифа. С этого момента между вами и исполнителем считается заключён договор на условиях оферты.",
        "1.3. Оферта действует бессрочно до её отзыва или замены новой редакцией. Актуальная версия — на странице /terms.",
        "1.4. Обработка персональных данных — по политике на /privacy. Сервис не предназначен для лиц младше 18 лет.",
      ],
    },
    {
      heading: "2. Исполнитель",
      paragraphs: [
        "Реквизиты исполнителя (ФИО, ИНН, статус НПД, контакты) — в блоке «Исполнитель» ниже на этой странице (/terms#seller).",
      ],
    },
    {
      heading: "3. Предмет договора",
      paragraphs: [
        "3.1. Исполнитель предоставляет пользователю удалённый доступ к функциям Сервиса: моделирование сделок на исторических рыночных данных (бэктест), отчёты, сравнение запусков и иные функции в зависимости от тарифа.",
        "3.2. Сервис носит информационный характер. Исполнитель не совершает сделки от имени пользователя, не принимает и не хранит денежные средства пользователя для торговли на биржах, не является брокером или инвестиционным советником.",
        "3.3. Результаты бэктеста строятся на исторических данных и допущениях модели; фактическая торговля может отличаться (ликвидность, проскальзывание, изменение правил биржи, сбои данных).",
      ],
    },
    {
      heading: "4. Регистрация и аккаунт",
      items: [
        "вход осуществляется через Telegram Login; один аккаунт привязан к идентификатору Telegram;",
        "пользователь обязан не передавать доступ к аккаунту третьим лицам в нарушение тарифа;",
        "исполнитель вправе ограничить или прекратить доступ при нарушении оферты, злоупотреблениях или требованиях закона;",
        "вход по email и паролю на сайте не предоставляется.",
      ],
    },
    {
      heading: "5. Тарифы, пробный период и оплата",
      paragraphs: [
        "Актуальные цены, состав функций и ограничения тарифов — на странице /pricing.",
      ],
      items: [
        termsPricingTrialLine("ru"),
        "Платные тарифы Basic и Pro — подписка на срок, указанный при оплате. Оплата и чек (кассовый чек самозанятого / документ платёжной системы) — через подключённого агрегатора (например, ЮKassa), когда оплата доступна на сайте.",
        "Автопродление — если включено при оплате и указано в интерфейсе; пользователь может отменить продление способом, указанным в аккаунте или через поддержку.",
        "Возврат средств — в случаях и порядке, предусмотренных законом о защите прав потребителей и правилами платёжного сервиса; цифровая услуга, фактически оказанная в пробном или оплаченном периоде, может ограничивать основания для возврата — уточняйте в обращении в поддержку.",
      ],
    },
    {
      heading: "6. Порядок оказания услуги",
      paragraphs: [
        "6.1. Услуга оказывается в электронной форме. После оплаты или активации пробного периода доступ предоставляется в личном кабинете — раздел «Терминал» по адресу /app.",
        "6.2. Физическая доставка товаров не производится. Доступ к Сервису считается предоставленным с момента активации тарифа в аккаунте.",
        "6.3. Исполнитель вправе проводить профилактические работы с предварительным уведомлением на сайте или в Telegram-канале поддержки, когда это возможно.",
      ],
    },
    {
      heading: "7. Права на контент и данные пользователя",
      paragraphs: [
        "7.1. Программный код, дизайн, тексты и база данных Сервиса принадлежат исполнителю или правомерным правообладателям. Пользователю предоставляется неисключительное право использования Сервиса в рамках тарифа.",
        "7.2. Параметры стратегий и сохранённые прогоны пользователя остаются его данными; исполнитель использует их для оказания услуги (хранение, отображение, история прогонов) в соответствии с /privacy.",
      ],
    },
    {
      heading: "8. Ограничение ответственности",
      paragraphs: [
        "8.1. Сервис предоставляется «как есть» в пределах, допустимых законом. Исполнитель не гарантирует бесперебойную работу, абсолютную точность данных биржи и достижение пользователем финансового результата.",
        "8.2. Материалы Сервиса не являются инвестиционной рекомендацией и не гарантируют доход. Решения на рынке принимает пользователь самостоятельно.",
        "8.3. Совокупная ответственность исполнителя по договору ограничивается суммой, фактически уплаченной пользователем за последний оплаченный период подписки, если иное не установлено императивными нормами закона.",
      ],
    },
    {
      heading: "9. Запрещённые действия",
      items: [
        "обход лимитов тарифа, несанкционированный доступ к API, DDoS, вмешательство в работу Сервиса;",
        "передача доступа к аккаунту третьим лицам с коммерческой перепродажей без согласования;",
        "использование Сервиса с нарушением законодательства РФ и прав третьих лиц;",
        "автоматизированный сбор данных с сайта в объёме, превышающем обычное использование терминала.",
      ],
    },
    {
      heading: "10. Изменение условий и прекращение доступа",
      paragraphs: [
        "10.1. Исполнитель может изменять оферту, тарифы и функции Сервиса; существенные изменения публикуются на /terms. Продолжение использования после публикации означает согласие, если иное не требуется законом.",
        "10.2. Пользователь может прекратить использование и запросить удаление аккаунта через support@backtestpro.ru или /help.",
        "10.3. Исполнитель может приостановить или прекратить доступ при нарушении оферты, неоплате или по требованию государственных органов.",
      ],
    },
    {
      heading: "11. Применимое право и споры",
      paragraphs: [
        "11.1. К отношениям сторон применяется право Российской Федерации.",
        "11.2. Претензии направляются на support@backtestpro.ru; срок рассмотрения — до 30 календарных дней, если иной не установлен законом.",
        "11.3. Споры подлежат рассмотрению в суде по месту жительства потребителя или иного суда, указанного императивными нормами ЗоЗПП, если пользователь выступает потребителем.",
      ],
    },
  ],
  sellerHeading: "Исполнитель",
  sellerInnLabel: "ИНН",
  sellerChannels: "Поддержка: email, Telegram и страница /help.",
  updated: "Обновлено: 12 марта 2026",
};

const en: TermsPageCopy = {
  metaTitle: "Terms of Service — BackTest Pro",
  title: "Terms of Service (public offer)",
  subtitle: "BackTest Pro (backtestpro.ru) · access to the backtesting service",
  sections: [
    {
      heading: "1. General",
      paragraphs: [
        "1.1. This document is a public offer to provide access to the BackTest Pro information service (the “Service”) at backtestpro.ru.",
        "1.2. You accept the offer by signing in with Telegram, using the Service, or paying for a plan. A contract on these terms is then formed between you and the provider.",
        "1.3. The current version is always at /terms. Personal data is processed under /privacy. The Service is not for users under 18.",
      ],
    },
    {
      heading: "2. Provider",
      paragraphs: [
        "Provider details (name, tax ID, self-employed status, contacts) — in the “Provider” block below (/terms#seller).",
      ],
    },
    {
      heading: "3. Scope of service",
      paragraphs: [
        "3.1. Remote access to backtesting, reports, comparisons, and other features depending on your plan.",
        "3.2. The Service is informational only — no trade execution, no custody of trading funds, no broker or investment advisory relationship.",
        "3.3. Backtests use historical data and model assumptions; live trading may differ materially.",
      ],
    },
    {
      heading: "4. Account",
      items: [
        "sign-in via Telegram Login; one account per Telegram id;",
        "do not share access in violation of plan terms;",
        "we may suspend access for abuse or legal compliance;",
        "email/password sign-in is not offered on the site.",
      ],
    },
    {
      heading: "5. Plans, trial, and payment",
      paragraphs: ["Current prices and features — /pricing."],
      items: [
        termsPricingTrialLine("en"),
        "Paid Basic and Pro — subscription for the term shown at checkout; receipts via the payment provider (e.g. YooKassa) when enabled.",
        "Auto-renewal — only if offered at checkout and described in the UI.",
        "Refunds — where required by consumer law and payment provider rules; contact support for case-by-case review.",
      ],
    },
    {
      heading: "6. Delivery",
      paragraphs: [
        "6.1. The Service is delivered electronically. After payment or trial activation, access is in the Terminal at /app.",
        "6.2. No physical goods are shipped. Access is deemed granted when the plan is active in your account.",
        "6.3. Maintenance may occur with notice on the site or support channel when feasible.",
      ],
    },
    {
      heading: "7. Intellectual property and your data",
      paragraphs: [
        "7.1. The Service software, design, and content belong to the provider or licensors. You receive a non-exclusive license to use the Service within your plan.",
        "7.2. Your strategy parameters and saved runs remain your data; we process them to provide the Service as described in /privacy.",
      ],
    },
    {
      heading: "8. Limitation of liability",
      paragraphs: [
        "8.1. The Service is provided “as is” to the extent permitted by law. No guarantee of uninterrupted operation or trading profits.",
        "8.2. Materials are not investment advice. You make your own trading decisions.",
        "8.3. Aggregate liability is limited to fees paid for the last billing period unless mandatory law says otherwise.",
      ],
    },
    {
      heading: "9. Prohibited conduct",
      items: [
        "bypassing plan limits, unauthorized API abuse, attacks, or interference with the Service;",
        "reselling account access without agreement;",
        "unlawful use;",
        "scraping beyond normal terminal use.",
      ],
    },
    {
      heading: "10. Changes and termination",
      paragraphs: [
        "10.1. We may update these terms and plans; material changes are posted at /terms.",
        "10.2. You may stop using the Service and request account deletion via support@backtestpro.ru or /help.",
        "10.3. We may suspend access for breach, non-payment, or legal requirements.",
      ],
    },
    {
      heading: "11. Governing law and disputes",
      paragraphs: [
        "11.1. Russian law applies to the extent relevant to the provider established in Russia.",
        "11.2. Claims: support@backtestpro.ru; we aim to respond within 30 days where applicable.",
        "11.3. Consumer disputes — courts as provided by mandatory consumer protection rules where you qualify as a consumer.",
      ],
    },
  ],
  sellerHeading: "Provider",
  sellerInnLabel: "Tax ID (INN)",
  sellerChannels: "Support: email, Telegram, and /help.",
  updated: "Updated: March 12, 2026",
};

export const termsPageCopy: Record<Locale, TermsPageCopy> = { ru, en };
