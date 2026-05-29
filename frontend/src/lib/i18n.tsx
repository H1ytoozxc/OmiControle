"use client";

import * as React from "react";

export type Lang = "en" | "ru";

const T = {
  en: {
    nav: {
      workspace: "Workspace",
      overview: "Overview",
      devices: "Devices",
      aiControl: "AI Control",
      workflows: "Workflows",
      operations: "Operations",
      notifications: "Notifications",
      identity: "Identity",
      system: "System",
      settings: "Settings",
      connected: "Connected",
    },
    topbar: {
      search: "Search · ask · command…",
      askSequoia: "Ask Sequoia",
    },
    login: {
      headline: "One control plane for your entire fleet.",
      subline: "Devices, AI agents, workflows, and telemetry — all in one place.",
      title: "Sign in",
      newHere: "New here?",
      createAccount: "Create an account",
      continueGitHub: "Continue with GitHub",
      continueGoogle: "Continue with Google",
      usePasskey: "Use a passkey",
      email: "Email",
      password: "Password",
      forgotPassword: "Forgot password?",
      signIn: "Sign in",
    },
    register: {
      headline: "Start managing your fleet today.",
      subline: "Free to start. Enroll unlimited devices, create workflows, and deploy AI agents.",
      features: [
        "Enroll devices in under 2 minutes",
        "Event-driven workflow automation",
        "AI agents for anomaly response",
        "End-to-end encrypted telemetry",
      ],
      title: "Create your account",
      alreadyHave: "Already have one?",
      signIn: "Sign in",
      continueGitHub: "Continue with GitHub",
      continueGoogle: "Continue with Google",
      fullName: "Full name",
      workEmail: "Work email",
      passwordLabel: "Password",
      passwordHint: "Min. 12 characters",
      continueBtn: "Continue",
      terms: "By continuing you agree to our",
      termsLink: "Terms",
      and: "and",
      privacyLink: "Privacy Policy",
      orgTitle: "Set up your organization",
      orgSubtitle: "This becomes your tenant namespace.",
      orgName: "Organization name",
      tenantSlug: "Tenant slug",
      slugHint: "Lowercase letters, numbers, and hyphens only.",
      region: "Region",
      regionPlaceholder: "Select a region…",
      back: "Back",
      createOrg: "Create organization",
      doneTitle: "You're all set",
      doneSubtitle: "Your organization is ready. Enroll your first device to get started.",
      connectDevice: "Connect your first device",
    },
    forgotPassword: {
      title: "Forgot your password?",
      subtitle: "Enter your email and we'll send a reset link.",
      email: "Email",
      send: "Send reset link",
      backToSignIn: "Back to sign in",
      sentTitle: "Check your inbox",
      sentSubtitle: "We sent a reset link to",
      sentNote: "Didn't get it? Check your spam folder.",
      openEmail: "Open email app",
      tryAnother: "Try another address",
    },
    onboarding: {
      stepLabel: "Connect your first device",
      title: "Connect your first device",
      subtitle: "The Sequoia agent will be available as a one-command install. It's not published yet — this is v0.1.",
      notReadyBadge: "Not published yet",
      notReadyTitle: "Agent installer coming soon",
      notReadyDesc: "The hosted installer (get.sequoia.io) doesn't exist yet. When it's ready, connecting a device will be a single command. For now, go straight to the dashboard.",
      futureCommand: "curl -fsSL https://get.sequoia.io/agent | sudo bash",
      futureNote: "This is what the command will look like when the installer is live.",
      // What the command will do
      whatLabel: "What will this command do?",
      explainIntro: "When published, this one-liner will download and install the Sequoia agent on the target machine.",
      curlLabel: "curl -fsSL https://get.sequoia.io/agent",
      curlDesc: "Downloads the install script (~8 KB) over HTTPS. Flags: -f (fail on HTTP errors), -s (silent), -S (show errors), -L (follow redirects).",
      pipeLabel: "| sudo bash",
      pipeDesc: "Pipes the script into bash as root. Required because the agent writes to system directories (/usr/local/bin, /etc/sequoia).",
      installsLabel: "What will get installed:",
      installItems: [
        "/usr/local/bin/sequoia-agent — agent binary",
        "/etc/sequoia/agent.toml — config with your tenant token",
        "sequoia-agent.service (Linux systemd) or launchd plist (macOS)",
      ],
      afterLabel: "After install:",
      afterDesc: "The agent starts automatically, connects to your tenant's control plane, and shows up in the Devices list within ~30 seconds.",
      goToDashboard: "Go to dashboard",
      skip: "Skip for now, I'll do this later",
      waiting: "Waiting for device to connect…",
      waitingNote: "The agent will appear here automatically once enrolled.",
      stepAccount: "Account",
      stepOrg: "Organization",
      stepConnect: "Connect",
    },
    dashboard: {
      eyebrow: "Overview",
      title: "Fleet control plane",
      subtitle: "Enroll your first device to start monitoring. Devices, workflows, and agents appear here in real time.",
      enrollDevice: "Enroll device",
      launchAgent: "Launch agent",
      kpis: [
        { label: "Devices online",   hint: "No devices enrolled"  },
        { label: "Realtime latency", hint: "Awaiting connection"   },
        { label: "Workflows / hr",   hint: "No workflows defined"  },
        { label: "Commands / hr",    hint: "No commands issued"    },
      ],
      activityTitle: "Activity",
      quickStart: "Quick start",
      quickLinks: [
        { label: "Enroll a device",    hint: "Install the agent on any host"       },
        { label: "Create a workflow",  hint: "Automate device operations"           },
        { label: "Configure an agent", hint: "AI-powered anomaly response"          },
        { label: "Open console",       hint: "Run commands on your fleet"           },
      ],
      systemStatus: "System status",
      systemRows: ["API gateway", "Database", "Realtime gateway", "Workflow workers"],
      operational: "operational",
    },
    ai: {
      title: "AI Control",
      eyebrow: "AI agents",
      empty: "No AI agents deployed",
      emptyNote: "AI agents respond to events and anomalies on your fleet automatically.",
      create: "Create agent",
    },
    workflows: {
      title: "Workflows",
      eyebrow: "Automation",
      empty: "No workflows yet",
      emptyNote: "Workflows automate responses to device and system events.",
      create: "Create workflow",
    },
    devices: {
      title: "Devices",
      eyebrow: "Fleet",
      searchPlaceholder: "Search devices…",
      empty: "No devices enrolled",
      emptyNote: "Install the agent on any Linux, macOS, or Windows machine to get started.",
      enroll: "Enroll first device",
    },
    users: {
      title: "Identity",
      eyebrow: "Users & access",
      invite: "Invite user",
      empty: "No users yet",
      emptyNote: "Invite team members to collaborate on your fleet.",
    },
    notifications: {
      title: "Notifications",
      eyebrow: "Alerts",
      empty: "No notifications",
      emptyNote: "Alerts from your devices and workflows will appear here.",
    },
    settings: {
      title: "Settings",
      eyebrow: "Configuration",
    },
    common: {
      noActivity: "No activity yet",
      noActivityNote: "Events will appear here as your fleet does things.",
    },
  },

  ru: {
    nav: {
      workspace: "Рабочее пространство",
      overview: "Обзор",
      devices: "Устройства",
      aiControl: "Управление ИИ",
      workflows: "Автоматизации",
      operations: "Операции",
      notifications: "Уведомления",
      identity: "Пользователи",
      system: "Система",
      settings: "Настройки",
      connected: "Подключено",
    },
    topbar: {
      search: "Поиск · команды…",
      askSequoia: "Спросить Sequoia",
    },
    login: {
      headline: "Единый центр управления всем флотом.",
      subline: "Устройства, ИИ-агенты, автоматизации и телеметрия — в одном месте.",
      title: "Войти",
      newHere: "Нет аккаунта?",
      createAccount: "Создать",
      continueGitHub: "Продолжить через GitHub",
      continueGoogle: "Продолжить через Google",
      usePasskey: "Использовать passkey",
      email: "Email",
      password: "Пароль",
      forgotPassword: "Забыли пароль?",
      signIn: "Войти",
    },
    register: {
      headline: "Начните управлять флотом прямо сейчас.",
      subline: "Бесплатно. Неограниченное количество устройств, автоматизации и ИИ-агенты.",
      features: [
        "Подключение устройства менее чем за 2 минуты",
        "Событийная автоматизация рабочих процессов",
        "ИИ-агенты для реагирования на аномалии",
        "Сквозное шифрование телеметрии",
      ],
      title: "Создайте аккаунт",
      alreadyHave: "Уже есть аккаунт?",
      signIn: "Войти",
      continueGitHub: "Продолжить через GitHub",
      continueGoogle: "Продолжить через Google",
      fullName: "Полное имя",
      workEmail: "Рабочий email",
      passwordLabel: "Пароль",
      passwordHint: "Минимум 12 символов",
      continueBtn: "Продолжить",
      terms: "Продолжая, вы соглашаетесь с",
      termsLink: "Условиями использования",
      and: "и",
      privacyLink: "Политикой конфиденциальности",
      orgTitle: "Настройте организацию",
      orgSubtitle: "Это станет пространством вашего тенанта.",
      orgName: "Название организации",
      tenantSlug: "Идентификатор тенанта",
      slugHint: "Только строчные буквы, цифры и дефисы.",
      region: "Регион",
      regionPlaceholder: "Выберите регион…",
      back: "Назад",
      createOrg: "Создать организацию",
      doneTitle: "Всё готово",
      doneSubtitle: "Ваша организация создана. Подключите первое устройство.",
      connectDevice: "Подключить первое устройство",
    },
    forgotPassword: {
      title: "Забыли пароль?",
      subtitle: "Введите email — мы отправим ссылку для сброса.",
      email: "Email",
      send: "Отправить ссылку",
      backToSignIn: "Вернуться ко входу",
      sentTitle: "Проверьте почту",
      sentSubtitle: "Мы отправили ссылку на",
      sentNote: "Не пришло? Проверьте папку «Спам».",
      openEmail: "Открыть почтовый клиент",
      tryAnother: "Другой адрес",
    },
    onboarding: {
      stepLabel: "Подключить первое устройство",
      title: "Подключить первое устройство",
      subtitle: "Агент Sequoia будет устанавливаться одной командой. Пока он не опубликован — это v0.1.",
      notReadyBadge: "Ещё не опубликовано",
      notReadyTitle: "Установщик агента скоро появится",
      notReadyDesc: "Хостед-установщик (get.sequoia.io) пока не существует. Когда он будет готов, подключение устройства займёт одну команду. Пока что переходите сразу на дашборд.",
      futureCommand: "curl -fsSL https://get.sequoia.io/agent | sudo bash",
      futureNote: "Так будет выглядеть команда, когда установщик появится.",
      whatLabel: "Что будет делать эта команда?",
      explainIntro: "После публикации эта однострочная команда скачает и установит агент Sequoia на целевую машину.",
      curlLabel: "curl -fsSL https://get.sequoia.io/agent",
      curlDesc: "Скачивает установочный скрипт по HTTPS. Флаги: -f — не выводить страницы ошибок, -s — тихий режим, -S — показывать ошибки, -L — следовать редиректам.",
      pipeLabel: "| sudo bash",
      pipeDesc: "Передаёт скрипт в bash с правами root. Нужно для записи в системные директории (/usr/local/bin, /etc/sequoia).",
      installsLabel: "Что будет устанавливаться:",
      installItems: [
        "/usr/local/bin/sequoia-agent — бинарный файл агента",
        "/etc/sequoia/agent.toml — конфиг с токеном вашего тенанта",
        "sequoia-agent.service (Linux systemd) или launchd plist (macOS)",
      ],
      afterLabel: "После установки:",
      afterDesc: "Агент запустится автоматически, подключится к управляющей плоскости и появится в списке устройств примерно через 30 секунд.",
      goToDashboard: "Перейти на дашборд",
      skip: "Пропустить, сделаю позже",
      waiting: "Ожидание подключения устройства…",
      waitingNote: "Агент появится здесь автоматически после регистрации.",
      stepAccount: "Аккаунт",
      stepOrg: "Организация",
      stepConnect: "Подключение",
    },
    dashboard: {
      eyebrow: "Обзор",
      title: "Управляющая плоскость",
      subtitle: "Подключите первое устройство, чтобы начать мониторинг. Устройства, автоматизации и агенты появятся здесь в реальном времени.",
      enrollDevice: "Подключить устройство",
      launchAgent: "Запустить агента",
      kpis: [
        { label: "Устройств онлайн",  hint: "Устройства не подключены" },
        { label: "Задержка realtime", hint: "Ожидание подключения"      },
        { label: "Автоматизаций / ч", hint: "Автоматизации не заданы"   },
        { label: "Команд / ч",        hint: "Команды не выдавались"     },
      ],
      activityTitle: "Активность",
      quickStart: "Быстрый старт",
      quickLinks: [
        { label: "Подключить устройство",    hint: "Установите агент на любой хост"          },
        { label: "Создать автоматизацию",    hint: "Автоматизируйте операции с устройствами" },
        { label: "Настроить ИИ-агента",      hint: "Автоматическое обнаружение аномалий"     },
        { label: "Открыть консоль",          hint: "Выполнять команды на флоте"              },
      ],
      systemStatus: "Статус системы",
      systemRows: ["API-шлюз", "База данных", "Realtime-шлюз", "Воркеры автоматизаций"],
      operational: "работает",
    },
    ai: {
      title: "Управление ИИ",
      eyebrow: "ИИ-агенты",
      empty: "ИИ-агенты не развёрнуты",
      emptyNote: "ИИ-агенты автоматически реагируют на события и аномалии в вашем флоте.",
      create: "Создать агента",
    },
    workflows: {
      title: "Автоматизации",
      eyebrow: "Автоматизация",
      empty: "Автоматизаций пока нет",
      emptyNote: "Автоматизации реагируют на события устройств и системы.",
      create: "Создать автоматизацию",
    },
    devices: {
      title: "Устройства",
      eyebrow: "Флот",
      searchPlaceholder: "Поиск устройств…",
      empty: "Устройства не подключены",
      emptyNote: "Установите агент на Linux, macOS или Windows, чтобы начать.",
      enroll: "Подключить устройство",
    },
    users: {
      title: "Пользователи",
      eyebrow: "Пользователи и доступ",
      invite: "Пригласить",
      empty: "Пользователей пока нет",
      emptyNote: "Пригласите участников команды для совместной работы.",
    },
    notifications: {
      title: "Уведомления",
      eyebrow: "Оповещения",
      empty: "Уведомлений нет",
      emptyNote: "Оповещения от устройств и автоматизаций будут появляться здесь.",
    },
    settings: {
      title: "Настройки",
      eyebrow: "Конфигурация",
    },
    common: {
      noActivity: "Активности пока нет",
      noActivityNote: "События будут появляться здесь по мере работы вашего флота.",
    },
  },
} as const;

export type Translations = typeof T.en;

interface LangCtxValue {
  lang: Lang;
  toggle: () => void;
}

const LangCtx = React.createContext<LangCtxValue>({ lang: "en", toggle: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<Lang>("en");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("sequoia_lang") as Lang | null;
    if (saved === "ru" || saved === "en") setLang(saved);
    setMounted(true);
  }, []);

  const toggle = React.useCallback(() => {
    setLang((l) => {
      const next: Lang = l === "en" ? "ru" : "en";
      localStorage.setItem("sequoia_lang", next);
      return next;
    });
  }, []);

  if (!mounted) {
    return <LangCtx.Provider value={{ lang: "en", toggle }}>{children}</LangCtx.Provider>;
  }

  return <LangCtx.Provider value={{ lang, toggle }}>{children}</LangCtx.Provider>;
}

export function useT(): Translations {
  const { lang } = React.useContext(LangCtx);
  return T[lang] as Translations;
}

export function useLang() {
  return React.useContext(LangCtx);
}
