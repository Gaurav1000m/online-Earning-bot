    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('dragstart',   e => e.preventDefault());

    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const DAILY_LIMIT = 15;

    const balanceDiv        = document.getElementById('balance');
    const totalAdsEl        = document.getElementById('totalAdsWatched');
    const totalEarnedEl     = document.getElementById('totalAdsEarned');
    const watchBtn          = document.getElementById('watchAdBtn');
    const adStatusDiv       = document.getElementById('adStatus');
    const userNameEl        = document.getElementById('userName');
    const userChatIdEl      = document.getElementById('userChatId');
    const userAvatarText    = document.getElementById('userAvatarText');
    const userAvatarImg     = document.getElementById('userAvatarImg');

    // ── Translation tables ─────────────────────────────────
    const translations = {
        en: {
            // Balance card
            totalBalance: 'Total Balance',
            availableToWithdraw: 'Available to withdraw',
            watchAds: 'Watch Ads',
            completeTasks: 'Complete Tasks',
            inviteFriends: 'Invite Friends',
            // Ads page
            watchAndEarn: 'Watch Ads & Earn',
            adsCardDesc: 'Complete and watch a short video ads and earn <strong>$0.30</strong>',
            watchAdBtn: 'Watch Ad',
            watchAdBtnSub: 'Complete video to earn instantly',
            readyToEarn: 'Ready to earn',
            todaysAds: "Today's Ads",
            dailyInfoSub: 'Watch up to <strong>15 ads per day</strong>.<br>Resets at midnight.',
            totalWatched: 'Total Watched',
            adsUnit: 'ads',
            rewardPerAd: 'Total Earned',
            // Tasks page
            taskHeaderTitle: 'Complete Tasks & Earn Rewards',
            joinChannels: 'Join Channels',
            joinChannelsDesc: 'Earn <strong>$0.10</strong> per channel',
            startBots: 'Start Bots',
            startBotsDesc: 'Earn <strong>$0.10</strong> per bot',
            subscribeYoutube: 'Subscribe Channel',
            subscribeYoutubeDesc: 'Earn <strong>$0.10</strong> for subscribing',
            subscribeBtn: 'Subscribe',
            allYoutubeDone: 'Channel subscribed!',
            progress: 'Progress',
            joinBtn: 'Join',
            startBtn: 'Start',
            allChannelsDone: 'All channels joined!',
            allBotsDone: 'All bots started!',
            // Invite page
            inviteAndEarn: 'Invite & Earn',
            inviteHeroEarn: 'Earn <strong style="color:#374151;font-weight:800;">$0.75</strong> for each invite',
            inviteHeroSub: 'Copy and share your invite link with friends to earn more.',
            friendsInvited: 'Friends Invited',
            earnedFromInvites: 'Earned from Invites',
            yourInviteLink: 'Your Invite Link',
            loading: 'Loading...',
            copy: 'Copy',
            shareWithFriends: 'Share with Friends',
            howItWorks: 'How it works',
            step1Title: 'Copy & Share',
            step1Desc: 'Copy your unique invite link and share it with friends or on social media.',
            step2Title: 'Friend Joins',
            step2Desc: 'Your friend opens the link and launches the mini app for the very first time.',
            step3Title: 'You Earn $0.75',
            step3Desc: '$0.75 is instantly credited to your balance. Each friend is counted only once.',
            // Withdraw page
            minPopupTitle: 'Minimum $10.00 Required',
            minPopupDesc: 'You need at least <strong>$10.00</strong> in your balance to withdraw. Keep watching ads and completing tasks to reach the minimum.',
            minPopupBtn: 'Got it',
            paymentMethod: 'Payment Method',
            paymentMethodDesc: "Select how you'd like to receive your payment",
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'Tron network · No fees',
            paypalTitle: 'PayPal',
            paypalSub: 'Instant to PayPal account',
            mobileTitle: 'Mobile Top-Up',
            mobileSub: 'Direct to phone number',
            amount: 'Amount',
            amountPlaceholder: 'Enter amount (e.g. 10.00)',
            availableBalance: 'Available balance:',
            minAmount: 'Min $10.00',
            walletAddress: 'Wallet Address',
            walletPlaceholder: 'e.g. TXyz...abc',
            walletHint: 'Enter your USDT TRC20 wallet address',
            paypalEmail: 'PayPal Email',
            paypalPlaceholder: 'e.g. you@email.com',
            paypalHint: 'Enter your PayPal email address',
            phoneNumber: 'Phone Number',
            phonePlaceholder: 'e.g. +1 555 000 0000',
            phoneHint: 'Enter your mobile number with country code',
            submitWithdrawal: 'Submit Withdrawal Request',
            withdrawalRequirements: 'Withdrawal Requirements',
            withdrawalHistory: 'Withdrawal History',
            processingTitle: 'Processing...',
            processingDesc: 'Your withdrawal request has been received and is being processed. Please wait.',
            successTitle: 'Payment Successful!',
            // Requirements list
            reqBalanceTitle: 'Minimum $10.00 Balance',
            reqBalanceSub: (b) => `Your balance: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'Done' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: 'Invite 5 Friends',
            reqInvitesSub: (n) => `Friends invited: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'Done' : `${n} / 5`,
            reqTasksTitle: 'Complete All Tasks',
            reqTasksSub: (done, total) => `Tasks done: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'Done' : `${done} / ${total}`,
            reqAdsTitle: 'Watch 80 Ads',
            reqAdsSub: (n) => `Ads watched: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'Done' : `${n} / 80`,
            // Nav
            navAds: 'Ads',
            navTasks: 'Tasks',
            navInvite: 'Invite',
            navWithdraw: 'Withdraw',
            // Dynamic messages
            loadingAd: 'Loading ad...',
            processingReward: 'Processing reward...',
            adRewardAdded: '+$0.30 added to your balance!',
            waitNext: (s) => `Wait ${s}s before next ad...`,
            adClosed: 'Ad closed before finishing.',
            noAds: 'No ads available right now.',
            adError: 'Error loading ad. Try again.',
            linkCopied: 'Link copied!',
            couldNotCopy: 'Could not copy link',
            channelReward: '+$0.10 added!',
            notJoinedYet: 'Not joined yet. Please join first.',
            channelError: 'Error verifying channel.',
            taskError: 'Error completing task.',
            minWithdraw: 'Minimum withdrawal is $10.00',
            exceedsBalance: 'Amount exceeds your balance',
            needInvites: 'You need to invite at least 5 friends',
            completeAllTasks: 'Please complete all tasks first',
            needAds: 'You need to watch at least 80 ads',
            shareText: 'Join PayPlus to earn money by watching short ads 📱\nThe easiest way to make $100 daily 💰',
            // Validation
            validTRC20: 'Valid USDT TRC20 address',
            invalidTRC20: 'Invalid — TRC20 addresses start with T and are 34 characters',
            validEmail: 'Valid email address',
            invalidEmail: 'Invalid email address format',
            validPhone: 'Valid phone number',
            invalidPhone: 'Invalid — use international format, e.g. +1 555 000 0000',
            minWithdrawError: 'Minimum withdrawal amount is $10.00',
            exceedsBalanceError: (b) => `Exceeds your balance of $${b.toFixed(2)}`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — looks good`,
            enterValid: (m) => ({ crypto: 'a valid USDT TRC20 address', paypal: 'a valid PayPal email', mobile: 'a valid international phone number' }[m]),
            processingWithdrawDesc: (amount, method) => `Your $${amount.toFixed(2)} withdrawal via ${method} is being processed. Please wait.`,
            successWithdrawDesc: (amount, method) => `Your $${amount.toFixed(2)} via ${method} has been sent. Check your account.`,
            processingBadge: 'Processing',
            paidBadge: 'Paid',
            // Language button label
            langLabel: 'English',
            // Header
            supportBtnLabel: 'Customer',
            supportBtnMain: 'Support',
            langBtnTopLabel: 'Language',
            // Earn toast
            rewardCredited: 'Reward Credited',
            rewardAmount: '+ $0.30 Earned',
            // Ad progress
            today: 'today',
            // Task done state
            done: 'Done',
            // Ban screen
            banBadge: '⚠ Account Suspended',
            banTitle: 'You Have Been Banned',
            banDesc: 'Your account has been suspended by the admin due to a violation of our rules and community guidelines.<br><br>You can no longer access PayPlus Rewards.',
            banBtn: 'Contact Support',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'Complete the steps below to unlock your withdrawal.',
            dailyLimitReached: '15 Ads Daily limit reached. Come back tomorrow!',
            pleaseEnter: 'Please enter',
        },
        fa: {
            // Balance card
            totalBalance: 'موجودی کل',
            availableToWithdraw: 'قابل برداشت',
            watchAds: 'تماشای آگهی',
            completeTasks: 'انجام وظایف',
            inviteFriends: 'دعوت دوستان',
            // Ads page
            watchAndEarn: 'تماشا کن، درآمد کسب کن',
            adsCardDesc: 'یک تبلیغ ویدیویی کوتاه را تا اخر تماشا کنید و <strong>0.30 دلار</strong> دریافت کنید',
            watchAdBtn: 'تماشای آگهی',
            watchAdBtnSub: 'ویدیو را کامل ببینید و درآمد کسب کنید',
            readyToEarn: 'آماده کسب درآمد',
            todaysAds: 'آگهی‌های امروز',
            dailyInfoSub: 'تا <strong>15 آگهی در روز</strong> تماشا کنید.<br>در نیمه شب ریست می‌شود.',
            totalWatched: 'کل تماشا شده',
            adsUnit: 'آگهی',
            rewardPerAd: 'کل درآمد از آگهی',
            // Tasks page
            taskHeaderTitle: 'انجام وظایف و کسب درآمد',
            joinChannels: 'پیوستن به کانال‌ها',
            joinChannelsDesc: 'برای هر کانال <strong>0.10 دلار</strong> دریافت کنید',
            startBots: 'شروع ربات‌ها',
            startBotsDesc: 'برای هر ربات <strong>0.10 دلار</strong> دریافت کنید',
            subscribeYoutube: 'اشتراک کانال',
            subscribeYoutubeDesc: 'برای اشتراک <strong>0.10 دلار</strong> دریافت کنید',
            subscribeBtn: 'اشتراک',
            allYoutubeDone: 'کانال اشتراک شد!',
            progress: 'پیشرفت',
            joinBtn: 'عضویت',
            startBtn: 'شروع',
            allChannelsDone: 'همه کانال‌ها عضو شدید!',
            allBotsDone: 'همه ربات‌ها شروع شدند!',
            // Invite page
            inviteAndEarn: 'دعوت کن، درآمد کسب کن',
            inviteHeroEarn: 'به ازای هر دعوت <strong style="color:#374151;font-weight:800;">0.75$</strong> دریافت کنید',
            inviteHeroSub: 'لینک دعوت خود را کپی کرده و با دوستان به اشتراک بگذارید.',
            friendsInvited: 'دوستان دعوت شده',
            earnedFromInvites: 'درآمد از دعوت‌ها',
            yourInviteLink: 'لینک دعوت شما',
            loading: 'در حال بارگذاری...',
            copy: 'کپی',
            shareWithFriends: 'اشتراک‌گذاری با دوستان',
            howItWorks: 'نحوه کارکرد',
            step1Title: 'کپی و اشتراک‌گذاری',
            step1Desc: 'لینک دعوت منحصر به فرد خود را کپی کرده و با دوستان یا در شبکه‌های اجتماعی به اشتراک بگذارید.',
            step2Title: 'دوست می‌پیوندد',
            step2Desc: 'دوستتان لینک را باز کرده و برای اولین بار برنامه را راه‌اندازی می‌کند.',
            step3Title: '0.75 دلار دریافت می‌کنید',
            step3Desc: '0.75 دلار فوراً به موجودی شما اضافه می‌شود. هر دوست فقط یک بار شمارش می‌شود.',
            // Withdraw page
            minPopupTitle: 'حداقل 10.00 دلار مورد نیاز است',
            minPopupDesc: 'برای برداشت به حداقل <strong>10.00 دلار</strong> در موجودی نیاز دارید. به تماشای آگهی و انجام وظایف ادامه دهید.',
            minPopupBtn: 'متوجه شدم',
            paymentMethod: 'روش پرداخت',
            paymentMethodDesc: 'نحوه دریافت پرداختتان را انتخاب کنید',
            cryptoTitle: 'رمزارز — USDT TRC20',
            cryptoSub: 'شبکه ترون · بدون کارمزد',
            paypalTitle: 'PayPal',
            paypalSub: 'فوری به حساب PayPal',
            mobileTitle: 'شارژ موبایل',
            mobileSub: 'مستقیم به شماره تلفن',
            amount: 'مبلغ',
            amountPlaceholder: 'مبلغ را وارد کنید (مثال: 10.00)',
            availableBalance: 'موجودی موجود:',
            minAmount: 'حداقل 10.00 دلار',
            walletAddress: 'آدرس کیف پول',
            walletPlaceholder: 'مثال: TXyz...abc',
            walletHint: 'آدرس کیف پول USDT TRC20 خود را وارد کنید',
            paypalEmail: 'ایمیل PayPal',
            paypalPlaceholder: 'مثال: you@email.com',
            paypalHint: 'ایمیل PayPal خود را وارد کنید',
            phoneNumber: 'شماره تلفن',
            phonePlaceholder: 'مثال: ‎+98 912 000 0000',
            phoneHint: 'شماره موبایل خود را با کد کشور وارد کنید',
            submitWithdrawal: 'ثبت درخواست برداشت',
            withdrawalRequirements: 'شرایط برداشت',
            withdrawalHistory: 'تاریخچه برداشت',
            processingTitle: 'در حال پردازش...',
            processingDesc: 'درخواست برداشت شما دریافت شده و در حال پردازش است. لطفاً منتظر بمانید.',
            successTitle: 'پرداخت موفق!',
            // Requirements list
            reqBalanceTitle: 'حداقل موجودی 10.00 دلار',
            reqBalanceSub: (b) => `موجودی شما: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'انجام شد' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: 'دعوت 5 دوست',
            reqInvitesSub: (n) => `دوستان دعوت شده: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'انجام شد' : `${n} / 5`,
            reqTasksTitle: 'تکمیل همه وظایف',
            reqTasksSub: (done, total) => `وظایف انجام شده: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'انجام شد' : `${done} / ${total}`,
            reqAdsTitle: 'تماشای 80 آگهی',
            reqAdsSub: (n) => `آگهی‌های تماشا شده: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'انجام شد' : `${n} / 80`,
            // Nav
            navAds: 'آگهی‌ها',
            navTasks: 'وظایف',
            navInvite: 'دعوت',
            navWithdraw: 'برداشت',
            // Dynamic messages
            loadingAd: 'در حال بارگذاری آگهی...',
            processingReward: 'در حال پردازش پاداش...',
            adRewardAdded: '0.30 دلار به موجودی شما اضافه شد!',
            waitNext: (s) => `${s} ثانیه تا آگهی بعدی صبر کنید...`,
            adClosed: 'آگهی قبل از اتمام بسته شد.',
            noAds: 'در حال حاضر آگهی موجود نیست.',
            adError: 'خطا در بارگذاری آگهی. دوباره امتحان کنید.',
            linkCopied: 'لینک کپی شد!',
            couldNotCopy: 'کپی لینک ممکن نشد',
            channelReward: '0.10 دلار اضافه شد!',
            notJoinedYet: 'هنوز عضو نشده‌اید. لطفاً اول عضو شوید.',
            channelError: 'خطا در تأیید کانال.',
            taskError: 'خطا در تکمیل وظیفه.',
            minWithdraw: 'حداقل مبلغ برداشت 10.00 دلار است',
            exceedsBalance: 'مبلغ از موجودی شما بیشتر است',
            needInvites: 'باید حداقل 5 دوست دعوت کنید',
            completeAllTasks: 'لطفاً ابتدا همه وظایف را تکمیل کنید',
            needAds: 'باید حداقل 80 آگهی تماشا کنید',
            shareText: 'به PayPlus بپیوندید و با تماشای آگهی‌های کوتاه درآمد کسب کنید 📱\nآسان‌ترین راه برای کسب 100 دلار در روز 💰',
            // Validation
            validTRC20: 'آدرس معتبر USDT TRC20',
            invalidTRC20: 'نامعتبر — آدرس‌های TRC20 با T شروع می‌شوند و 34 کاراکتر دارند',
            validEmail: 'ایمیل معتبر',
            invalidEmail: 'فرمت ایمیل نامعتبر',
            validPhone: 'شماره تلفن معتبر',
            invalidPhone: 'نامعتبر — از فرمت بین‌المللی استفاده کنید، مثال: ‎+98 912 000 0000',
            minWithdrawError: 'حداقل مبلغ برداشت 10.00 دلار است',
            exceedsBalanceError: (b) => `از موجودی شما ($${b.toFixed(2)}) بیشتر است`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — مناسب است`,
            enterValid: (m) => ({ crypto: 'یک آدرس معتبر USDT TRC20', paypal: 'یک ایمیل معتبر PayPal', mobile: 'یک شماره تلفن بین‌المللی معتبر' }[m]),
            processingWithdrawDesc: (amount, method) => `برداشت $${amount.toFixed(2)} از طریق ${method} در حال پردازش است. لطفاً منتظر بمانید.`,
            successWithdrawDesc: (amount, method) => `$${amount.toFixed(2)} از طریق ${method} ارسال شد. حساب خود را بررسی کنید.`,
            processingBadge: 'در پردازش',
            paidBadge: 'پرداخت شد',
            // Language button label
            langLabel: 'فارسی',
            // Header
            supportBtnLabel: 'پشتیبانی',
            supportBtnMain: 'مشتریان',
            langBtnTopLabel: 'زبان',
            // Earn toast
            rewardCredited: 'پاداش دریافت شد',
            rewardAmount: '+ 0.30 دلار کسب شد',
            // Ad progress
            today: 'امروز',
            // Task done state
            done: 'انجام شد',
            // Ban screen
            banBadge: '⚠ حساب معلق شد',
            banTitle: 'شما مسدود شده‌اید',
            banDesc: 'حساب شما توسط مدیر به دلیل نقض قوانین و دستورالعمل‌های ما معلق شده است.<br><br>شما دیگر نمی‌توانید به PayPlus Rewards دسترسی داشته باشید.',
            banBtn: 'تماس با پشتیبانی',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'برای باز کردن قفل برداشت، مراحل زیر را کامل کنید.',
            dailyLimitReached: 'محدودیت 15 آگهی روزانه تمام شد. فردا برگردید!',
            pleaseEnter: 'لطفاً وارد کنید',
        },
        es: {
            // Balance card
            totalBalance: 'Saldo Total',
            availableToWithdraw: 'Disponible para retirar',
            watchAds: 'Ver Anuncios',
            completeTasks: 'Completar Tareas',
            inviteFriends: 'Invitar Amigos',
            // Ads page
            watchAndEarn: 'Mira Anuncios y Gana',
            adsCardDesc: 'Completa y mira un anuncio de video corto y gana <strong>$0.30</strong>',
            watchAdBtn: 'Ver Anuncio',
            watchAdBtnSub: 'Completa el video para ganar al instante',
            readyToEarn: 'Listo para ganar',
            todaysAds: 'Anuncios de hoy',
            dailyInfoSub: 'Mira hasta <strong>15 anuncios por día</strong>.<br>Se reinicia a medianoche.',
            totalWatched: 'Total visto',
            adsUnit: 'anuncios',
            rewardPerAd: 'Total ganado',
            // Tasks page
            taskHeaderTitle: 'Completa tareas y gana recompensas',
            joinChannels: 'Unirse a canales',
            joinChannelsDesc: 'Gana <strong>$0.10</strong> por canal',
            startBots: 'Iniciar Bots',
            startBotsDesc: 'Gana <strong>$0.10</strong> por bot',
            subscribeYoutube: 'Suscribirse al canal',
            subscribeYoutubeDesc: 'Gana <strong>$0.10</strong> por suscripción',
            subscribeBtn: 'Suscribirse',
            allYoutubeDone: '¡Canal suscrito!',
            progress: 'Progreso',
            joinBtn: 'Unirse',
            startBtn: 'Iniciar',
            allChannelsDone: '¡Te uniste a todos los canales!',
            allBotsDone: '¡Todos los bots iniciados!',
            // Invite page
            inviteAndEarn: 'Invita y Gana',
            inviteHeroEarn: 'Gana <strong style="color:#374151;font-weight:800;">$0.75</strong> por cada invitación',
            inviteHeroSub: 'Copia y comparte tu enlace de invitación con amigos para ganar más.',
            friendsInvited: 'Amigos invitados',
            earnedFromInvites: 'Ganado de invitaciones',
            yourInviteLink: 'Tu enlace de invitación',
            loading: 'Cargando...',
            copy: 'Copiar',
            shareWithFriends: 'Compartir con amigos',
            howItWorks: 'Cómo funciona',
            step1Title: 'Copia y comparte',
            step1Desc: 'Copia tu enlace único de invitación y compártelo con amigos o en redes sociales.',
            step2Title: 'Tu amigo se une',
            step2Desc: 'Tu amigo abre el enlace y lanza la mini app por primera vez.',
            step3Title: 'Ganas $0.75',
            step3Desc: '$0.75 se acredita instantáneamente en tu saldo. Cada amigo se cuenta solo una vez.',
            // Withdraw page
            minPopupTitle: 'Se requieren mínimo $10.00',
            minPopupDesc: 'Necesitas al menos <strong>$10.00</strong> en tu saldo para retirar. Sigue viendo anuncios y completando tareas.',
            minPopupBtn: 'Entendido',
            paymentMethod: 'Método de pago',
            paymentMethodDesc: 'Selecciona cómo quieres recibir tu pago',
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'Red Tron · Sin comisiones',
            paypalTitle: 'PayPal',
            paypalSub: 'Instantáneo a cuenta PayPal',
            mobileTitle: 'Recarga Móvil',
            mobileSub: 'Directo al número de teléfono',
            amount: 'Monto',
            amountPlaceholder: 'Ingresa el monto (ej. 10.00)',
            availableBalance: 'Saldo disponible:',
            minAmount: 'Mín $10.00',
            walletAddress: 'Dirección del monedero',
            walletPlaceholder: 'ej. TXyz...abc',
            walletHint: 'Ingresa tu dirección de monedero USDT TRC20',
            paypalEmail: 'Correo PayPal',
            paypalPlaceholder: 'ej. tu@correo.com',
            paypalHint: 'Ingresa tu correo electrónico de PayPal',
            phoneNumber: 'Número de teléfono',
            phonePlaceholder: 'ej. +1 555 000 0000',
            phoneHint: 'Ingresa tu número móvil con código de país',
            submitWithdrawal: 'Enviar solicitud de retiro',
            withdrawalRequirements: 'Requisitos de retiro',
            withdrawalHistory: 'Historial de retiros',
            processingTitle: 'Procesando...',
            processingDesc: 'Tu solicitud de retiro ha sido recibida y está siendo procesada. Por favor espera.',
            successTitle: '¡Pago exitoso!',
            // Requirements list
            reqBalanceTitle: 'Saldo mínimo $10.00',
            reqBalanceSub: (b) => `Tu saldo: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'Listo' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: 'Invita a 5 amigos',
            reqInvitesSub: (n) => `Amigos invitados: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'Listo' : `${n} / 5`,
            reqTasksTitle: 'Completa todas las tareas',
            reqTasksSub: (done, total) => `Tareas completadas: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'Listo' : `${done} / ${total}`,
            reqAdsTitle: 'Ver 80 anuncios',
            reqAdsSub: (n) => `Anuncios vistos: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'Listo' : `${n} / 80`,
            // Nav
            navAds: 'Anuncios',
            navTasks: 'Tareas',
            navInvite: 'Invitar',
            navWithdraw: 'Retirar',
            // Dynamic messages
            loadingAd: 'Cargando anuncio...',
            processingReward: 'Procesando recompensa...',
            adRewardAdded: '¡+$0.30 añadido a tu saldo!',
            waitNext: (s) => `Espera ${s}s antes del próximo anuncio...`,
            adClosed: 'Anuncio cerrado antes de terminar.',
            noAds: 'No hay anuncios disponibles ahora.',
            adError: 'Error al cargar el anuncio. Intenta de nuevo.',
            linkCopied: '¡Enlace copiado!',
            couldNotCopy: 'No se pudo copiar el enlace',
            channelReward: '¡+$0.10 añadido!',
            notJoinedYet: 'Aún no te has unido. Por favor únete primero.',
            channelError: 'Error al verificar el canal.',
            taskError: 'Error al completar la tarea.',
            minWithdraw: 'El retiro mínimo es $10.00',
            exceedsBalance: 'El monto supera tu saldo',
            needInvites: 'Necesitas invitar al menos a 5 amigos',
            completeAllTasks: 'Por favor completa todas las tareas primero',
            needAds: 'Necesitas ver al menos 80 anuncios',
            shareText: 'Únete a PayPlus para ganar dinero viendo anuncios cortos 📱\nLa forma más fácil de ganar $100 diarios 💰',
            // Validation
            validTRC20: 'Dirección USDT TRC20 válida',
            invalidTRC20: 'Inválida — las direcciones TRC20 comienzan con T y tienen 34 caracteres',
            validEmail: 'Correo electrónico válido',
            invalidEmail: 'Formato de correo electrónico inválido',
            validPhone: 'Número de teléfono válido',
            invalidPhone: 'Inválido — usa formato internacional, ej. +1 555 000 0000',
            minWithdrawError: 'El monto mínimo de retiro es $10.00',
            exceedsBalanceError: (b) => `Supera tu saldo de $${b.toFixed(2)}`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — se ve bien`,
            enterValid: (m) => ({ crypto: 'una dirección USDT TRC20 válida', paypal: 'un correo PayPal válido', mobile: 'un número de teléfono internacional válido' }[m]),
            processingWithdrawDesc: (amount, method) => `Tu retiro de $${amount.toFixed(2)} vía ${method} está siendo procesado. Por favor espera.`,
            successWithdrawDesc: (amount, method) => `Tu $${amount.toFixed(2)} vía ${method} ha sido enviado. Revisa tu cuenta.`,
            processingBadge: 'Procesando',
            paidBadge: 'Pagado',
            // Language button label
            langLabel: 'Español',
            // Header
            supportBtnLabel: 'Soporte',
            supportBtnMain: 'al cliente',
            langBtnTopLabel: 'Idioma',
            // Earn toast
            rewardCredited: 'Recompensa acreditada',
            rewardAmount: '+ $0.30 ganado',
            // Ad progress
            today: 'hoy',
            // Task done state
            done: 'Listo',
            // Ban screen
            banBadge: '⚠ Cuenta Suspendida',
            banTitle: 'Has Sido Bloqueado',
            banDesc: 'Tu cuenta ha sido suspendida por el administrador debido a una violación de nuestras reglas y directrices de la comunidad.<br><br>Ya no puedes acceder a PayPlus Rewards.',
            banBtn: 'Contactar soporte',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'Completa los pasos a continuación para desbloquear tu retiro.',
            dailyLimitReached: '¡Límite de 15 anuncios diarios alcanzado. ¡Vuelve mañana!',
            pleaseEnter: 'Por favor ingresa',
        },
        ar: {
            // Balance card
            totalBalance: 'الرصيد الإجمالي',
            availableToWithdraw: 'متاح للسحب',
            watchAds: 'مشاهدة الإعلانات',
            completeTasks: 'إكمال المهام',
            inviteFriends: 'دعوة الأصدقاء',
            // Ads page
            watchAndEarn: 'شاهد واكسب',
            adsCardDesc: 'أكمل وشاهد إعلان فيديو قصير واكسب <strong>$0.30</strong>',
            watchAdBtn: 'مشاهدة الإعلان',
            watchAdBtnSub: 'أكمل الفيديو لتكسب فوراً',
            readyToEarn: 'مستعد للكسب',
            todaysAds: 'إعلانات اليوم',
            dailyInfoSub: 'شاهد حتى <strong>15 إعلانات يومياً</strong>.<br>تتجدد عند منتصف الليل.',
            totalWatched: 'إجمالي المشاهدات',
            adsUnit: 'إعلانات',
            rewardPerAd: 'إجمالي الأرباح',
            // Tasks page
            taskHeaderTitle: 'أكمل المهام واكسب المكافآت',
            joinChannels: 'الانضمام للقنوات',
            joinChannelsDesc: 'اكسب <strong>$0.10</strong> لكل قناة',
            startBots: 'تشغيل البوتات',
            startBotsDesc: 'اكسب <strong>$0.10</strong> لكل بوت',
            subscribeYoutube: 'الاشتراك في القناة',
            subscribeYoutubeDesc: 'اكسب <strong>$0.10</strong> لكل اشتراك',
            subscribeBtn: 'اشترك',
            allYoutubeDone: 'تم الاشتراك في القناة!',
            progress: 'التقدم',
            joinBtn: 'انضمام',
            startBtn: 'تشغيل',
            allChannelsDone: 'انضممت لجميع القنوات!',
            allBotsDone: 'تم تشغيل جميع البوتات!',
            // Invite page
            inviteAndEarn: 'ادع واكسب',
            inviteHeroEarn: 'اكسب <strong style="color:#374151;font-weight:800;">$0.75</strong> لكل دعوة',
            inviteHeroSub: 'انسخ وشارك رابط الدعوة مع أصدقائك لتكسب أكثر.',
            friendsInvited: 'الأصدقاء المدعوون',
            earnedFromInvites: 'الأرباح من الدعوات',
            yourInviteLink: 'رابط دعوتك',
            loading: 'جاري التحميل...',
            copy: 'نسخ',
            shareWithFriends: 'مشاركة مع الأصدقاء',
            howItWorks: 'كيف يعمل',
            step1Title: 'انسخ وشارك',
            step1Desc: 'انسخ رابط دعوتك الفريد وشاركه مع أصدقائك أو على وسائل التواصل الاجتماعي.',
            step2Title: 'صديقك ينضم',
            step2Desc: 'يفتح صديقك الرابط ويشغّل التطبيق الصغير لأول مرة.',
            step3Title: 'تكسب $0.75',
            step3Desc: 'تُضاف $0.75 فوراً إلى رصيدك. كل صديق يُحسب مرة واحدة فقط.',
            // Withdraw page
            minPopupTitle: 'مطلوب $10.00 على الأقل',
            minPopupDesc: 'تحتاج إلى <strong>$10.00</strong> على الأقل في رصيدك للسحب. تابع مشاهدة الإعلانات وإكمال المهام.',
            minPopupBtn: 'حسناً',
            paymentMethod: 'طريقة الدفع',
            paymentMethodDesc: 'اختر كيف تريد استلام دفعتك',
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'شبكة ترون · بدون رسوم',
            paypalTitle: 'PayPal',
            paypalSub: 'فوري إلى حساب PayPal',
            mobileTitle: 'شحن رصيد هاتف',
            mobileSub: 'مباشرة إلى رقم الهاتف',
            amount: 'المبلغ',
            amountPlaceholder: 'أدخل المبلغ (مثال: 10.00)',
            availableBalance: 'الرصيد المتاح:',
            minAmount: 'الحد الأدنى $10.00',
            walletAddress: 'عنوان المحفظة',
            walletPlaceholder: 'مثال: TXyz...abc',
            walletHint: 'أدخل عنوان محفظة USDT TRC20',
            paypalEmail: 'بريد PayPal',
            paypalPlaceholder: 'مثال: you@email.com',
            paypalHint: 'أدخل عنوان البريد الإلكتروني لـ PayPal',
            phoneNumber: 'رقم الهاتف',
            phonePlaceholder: 'مثال: +966 555 000 000',
            phoneHint: 'أدخل رقم هاتفك مع رمز الدولة',
            submitWithdrawal: 'إرسال طلب السحب',
            withdrawalRequirements: 'متطلبات السحب',
            withdrawalHistory: 'سجل السحوبات',
            processingTitle: 'جاري المعالجة...',
            processingDesc: 'تم استلام طلب سحبك وهو قيد المعالجة. يرجى الانتظار.',
            successTitle: 'تم الدفع بنجاح!',
            // Requirements list
            reqBalanceTitle: 'الرصيد الأدنى $10.00',
            reqBalanceSub: (b) => `رصيدك: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'مكتمل' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: 'دعوة 5 أصدقاء',
            reqInvitesSub: (n) => `الأصدقاء المدعوون: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'مكتمل' : `${n} / 5`,
            reqTasksTitle: 'إكمال جميع المهام',
            reqTasksSub: (done, total) => `المهام المكتملة: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'مكتمل' : `${done} / ${total}`,
            reqAdsTitle: 'مشاهدة 80 إعلانات',
            reqAdsSub: (n) => `الإعلانات المشاهدة: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'مكتمل' : `${n} / 80`,
            // Nav
            navAds: 'الإعلانات',
            navTasks: 'المهام',
            navInvite: 'دعوة',
            navWithdraw: 'سحب',
            // Dynamic messages
            loadingAd: 'جاري تحميل الإعلان...',
            processingReward: 'جاري معالجة المكافأة...',
            adRewardAdded: '‎+$0.30 أضيفت إلى رصيدك!',
            waitNext: (s) => `انتظر ${s}ث قبل الإعلان التالي...`,
            adClosed: 'تم إغلاق الإعلان قبل الانتهاء.',
            noAds: 'لا توجد إعلانات متاحة الآن.',
            adError: 'خطأ في تحميل الإعلان. حاول مرة أخرى.',
            linkCopied: 'تم نسخ الرابط!',
            couldNotCopy: 'تعذّر نسخ الرابط',
            channelReward: '‎+$0.10 أضيفت!',
            notJoinedYet: 'لم تنضم بعد. يرجى الانضمام أولاً.',
            channelError: 'خطأ في التحقق من القناة.',
            taskError: 'خطأ في إكمال المهمة.',
            minWithdraw: 'الحد الأدنى للسحب هو $10.00',
            exceedsBalance: 'المبلغ يتجاوز رصيدك',
            needInvites: 'تحتاج إلى دعوة 5 أصدقاء على الأقل',
            completeAllTasks: 'يرجى إكمال جميع المهام أولاً',
            needAds: 'تحتاج إلى مشاهدة 80 إعلانات على الأقل',
            shareText: 'انضم إلى PayPlus لكسب المال بمشاهدة إعلانات قصيرة 📱\nأسهل طريقة لكسب $100 يوميًا 💰',
            // Validation
            validTRC20: 'عنوان USDT TRC20 صالح',
            invalidTRC20: 'غير صالح — عناوين TRC20 تبدأ بـ T وطولها 34 حرفاً',
            validEmail: 'بريد إلكتروني صالح',
            invalidEmail: 'صيغة البريد الإلكتروني غير صالحة',
            validPhone: 'رقم هاتف صالح',
            invalidPhone: 'غير صالح — استخدم الصيغة الدولية، مثال: ‎+966 555 000 000',
            minWithdrawError: 'الحد الأدنى للسحب هو $10.00',
            exceedsBalanceError: (b) => `يتجاوز رصيدك $${b.toFixed(2)}`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — يبدو جيداً`,
            enterValid: (m) => ({ crypto: 'عنوان USDT TRC20 صالح', paypal: 'بريد PayPal صالح', mobile: 'رقم هاتف دولي صالح' }[m]),
            processingWithdrawDesc: (amount, method) => `طلب سحب $${amount.toFixed(2)} عبر ${method} قيد المعالجة. يرجى الانتظار.`,
            successWithdrawDesc: (amount, method) => `تم إرسال $${amount.toFixed(2)} عبر ${method}. تحقق من حسابك.`,
            processingBadge: 'جاري المعالجة',
            paidBadge: 'تم الدفع',
            // Language button label
            langLabel: 'العربية',
            // Header
            supportBtnLabel: 'الدعم',
            supportBtnMain: 'العملاء',
            langBtnTopLabel: 'اللغة',
            // Earn toast
            rewardCredited: 'تم إضافة المكافأة',
            rewardAmount: '‎+ $0.30 ربحت',
            // Ad progress
            today: 'اليوم',
            // Task done state
            done: 'مكتمل',
            // Ban screen
            banBadge: '⚠ حساب موقوف',
            banTitle: 'تم حظرك',
            banDesc: 'تم تعليق حسابك من قبل المشرف بسبب انتهاك قواعدنا وإرشادات المجتمع.<br><br>لم يعد بإمكانك الوصول إلى PayPlus Rewards.',
            banBtn: 'التواصل مع الدعم',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'أكمل الخطوات أدناه لفتح السحب.',
            dailyLimitReached: 'تم الوصول إلى حد 15 إعلانات يوميًا. عد غدًا!',
            pleaseEnter: 'يرجى إدخال',
        },
        fr: {
            // Balance card
            totalBalance: 'Solde Total',
            availableToWithdraw: 'Disponible au retrait',
            watchAds: 'Voir les Publicités',
            completeTasks: 'Compléter les Tâches',
            inviteFriends: 'Inviter des Amis',
            // Ads page
            watchAndEarn: 'Regardez et Gagnez',
            adsCardDesc: 'Complétez et regardez une courte publicité vidéo et gagnez <strong>$0.30</strong>',
            watchAdBtn: 'Voir la Publicité',
            watchAdBtnSub: 'Complétez la vidéo pour gagner instantanément',
            readyToEarn: 'Prêt à gagner',
            todaysAds: 'Publicités du jour',
            dailyInfoSub: 'Regardez jusqu\'à <strong>15 publicités par jour</strong>.<br>Se réinitialise à minuit.',
            totalWatched: 'Total regardé',
            adsUnit: 'publicités',
            rewardPerAd: 'Total gagné',
            // Tasks page
            taskHeaderTitle: 'Complétez des tâches et gagnez des récompenses',
            joinChannels: 'Rejoindre des chaînes',
            joinChannelsDesc: 'Gagnez <strong>$0.10</strong> par chaîne',
            startBots: 'Démarrer des Bots',
            startBotsDesc: 'Gagnez <strong>$0.10</strong> par bot',
            subscribeYoutube: 'S\'abonner à la chaîne',
            subscribeYoutubeDesc: 'Gagnez <strong>$0.10</strong> par abonnement',
            subscribeBtn: 'S\'abonner',
            allYoutubeDone: 'Chaîne suivie !',
            progress: 'Progression',
            joinBtn: 'Rejoindre',
            startBtn: 'Démarrer',
            allChannelsDone: 'Vous avez rejoint toutes les chaînes !',
            allBotsDone: 'Tous les bots démarrés !',
            // Invite page
            inviteAndEarn: 'Invitez et Gagnez',
            inviteHeroEarn: 'Gagnez <strong style="color:#374151;font-weight:800;">$0.75</strong> par invitation',
            inviteHeroSub: 'Copiez et partagez votre lien d\'invitation avec vos amis pour gagner plus.',
            friendsInvited: 'Amis invités',
            earnedFromInvites: 'Gains des invitations',
            yourInviteLink: 'Votre lien d\'invitation',
            loading: 'Chargement...',
            copy: 'Copier',
            shareWithFriends: 'Partager avec des amis',
            howItWorks: 'Comment ça fonctionne',
            step1Title: 'Copiez et partagez',
            step1Desc: 'Copiez votre lien d\'invitation unique et partagez-le avec vos amis ou sur les réseaux sociaux.',
            step2Title: 'Votre ami rejoint',
            step2Desc: 'Votre ami ouvre le lien et lance la mini app pour la première fois.',
            step3Title: 'Vous gagnez $0.75',
            step3Desc: '$0.75 est crédité instantanément sur votre solde. Chaque ami ne compte qu\'une seule fois.',
            // Withdraw page
            minPopupTitle: 'Minimum $10.00 requis',
            minPopupDesc: 'Vous avez besoin d\'au moins <strong>$10.00</strong> dans votre solde pour retirer. Continuez à regarder des publicités et à compléter des tâches.',
            minPopupBtn: 'Compris',
            paymentMethod: 'Méthode de paiement',
            paymentMethodDesc: 'Choisissez comment vous souhaitez recevoir votre paiement',
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'Réseau Tron · Sans frais',
            paypalTitle: 'PayPal',
            paypalSub: 'Instantané vers compte PayPal',
            mobileTitle: 'Recharge Mobile',
            mobileSub: 'Directement au numéro de téléphone',
            amount: 'Montant',
            amountPlaceholder: 'Entrez le montant (ex. 10.00)',
            availableBalance: 'Solde disponible :',
            minAmount: 'Min $10.00',
            walletAddress: 'Adresse du portefeuille',
            walletPlaceholder: 'ex. TXyz...abc',
            walletHint: 'Entrez votre adresse de portefeuille USDT TRC20',
            paypalEmail: 'Email PayPal',
            paypalPlaceholder: 'ex. vous@email.com',
            paypalHint: 'Entrez votre adresse email PayPal',
            phoneNumber: 'Numéro de téléphone',
            phonePlaceholder: 'ex. +33 6 00 00 00 00',
            phoneHint: 'Entrez votre numéro de mobile avec l\'indicatif pays',
            submitWithdrawal: 'Soumettre la demande de retrait',
            withdrawalRequirements: 'Conditions de retrait',
            withdrawalHistory: 'Historique des retraits',
            processingTitle: 'En cours...',
            processingDesc: 'Votre demande de retrait a été reçue et est en cours de traitement. Veuillez patienter.',
            successTitle: 'Paiement réussi !',
            // Requirements list
            reqBalanceTitle: 'Solde minimum $10.00',
            reqBalanceSub: (b) => `Votre solde : $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'Prêt' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: 'Invitez 5 amis',
            reqInvitesSub: (n) => `Amis invités : ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'Prêt' : `${n} / 5`,
            reqTasksTitle: 'Compléter toutes les tâches',
            reqTasksSub: (done, total) => `Tâches complétées : ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'Prêt' : `${done} / ${total}`,
            reqAdsTitle: 'Regarder 80 publicités',
            reqAdsSub: (n) => `Publicités regardées : ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'Prêt' : `${n} / 80`,
            // Nav
            navAds: 'Pubs',
            navTasks: 'Tâches',
            navInvite: 'Inviter',
            navWithdraw: 'Retirer',
            // Dynamic messages
            loadingAd: 'Chargement de la publicité...',
            processingReward: 'Traitement de la récompense...',
            adRewardAdded: '+$0.30 ajouté à votre solde !',
            waitNext: (s) => `Attendez ${s}s avant la prochaine publicité...`,
            adClosed: 'Publicité fermée avant la fin.',
            noAds: 'Aucune publicité disponible pour l\'instant.',
            adError: 'Erreur de chargement de la publicité. Réessayez.',
            linkCopied: 'Lien copié !',
            couldNotCopy: 'Impossible de copier le lien',
            channelReward: '+$0.10 ajouté !',
            notJoinedYet: 'Vous n\'avez pas encore rejoint. Veuillez rejoindre d\'abord.',
            channelError: 'Erreur lors de la vérification du canal.',
            taskError: 'Erreur lors de la complétion de la tâche.',
            minWithdraw: 'Le retrait minimum est de $10.00',
            exceedsBalance: 'Le montant dépasse votre solde',
            needInvites: 'Vous devez inviter au moins 5 amis',
            completeAllTasks: 'Veuillez compléter toutes les tâches d\'abord',
            needAds: 'Vous devez regarder au moins 80 publicités',
            shareText: 'Rejoignez PayPlus pour gagner de l\'argent en regardant des pubs courtes 📱\nLa façon la plus facile de gagner $100 par jour 💰',
            // Validation
            validTRC20: 'Adresse USDT TRC20 valide',
            invalidTRC20: 'Invalide — les adresses TRC20 commencent par T et font 34 caractères',
            validEmail: 'Email valide',
            invalidEmail: 'Format d\'email invalide',
            validPhone: 'Numéro de téléphone valide',
            invalidPhone: 'Invalide — utilisez le format international, ex. +33 6 00 00 00 00',
            minWithdrawError: 'Le montant minimum de retrait est de $10.00',
            exceedsBalanceError: (b) => `Dépasse votre solde de $${b.toFixed(2)}`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — parfait`,
            enterValid: (m) => ({ crypto: 'une adresse USDT TRC20 valide', paypal: 'un email PayPal valide', mobile: 'un numéro de téléphone international valide' }[m]),
            processingWithdrawDesc: (amount, method) => `Votre retrait de $${amount.toFixed(2)} via ${method} est en cours de traitement. Veuillez patienter.`,
            successWithdrawDesc: (amount, method) => `Votre $${amount.toFixed(2)} via ${method} a été envoyé. Vérifiez votre compte.`,
            processingBadge: 'En cours',
            paidBadge: 'Payé',
            // Language button label
            langLabel: 'Français',
            // Header
            supportBtnLabel: 'Support',
            supportBtnMain: 'client',
            langBtnTopLabel: 'Langue',
            // Earn toast
            rewardCredited: 'Récompense créditée',
            rewardAmount: '+ $0.30 gagné',
            // Ad progress
            today: 'aujourd\'hui',
            // Task done state
            done: 'Terminé',
            // Ban screen
            banBadge: '⚠ Compte Suspendu',
            banTitle: 'Vous Avez Été Bloqué',
            banDesc: 'Votre compte a été suspendu par l\'administrateur en raison d\'une violation de nos règles et directives communautaires.<br><br>Vous ne pouvez plus accéder à PayPlus Rewards.',
            banBtn: 'Contacter le support',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'Complétez les étapes ci-dessous pour débloquer votre retrait.',
            dailyLimitReached: 'Limite de 15 publicités quotidiennes atteinte. Revenez demain !',
            pleaseEnter: 'Veuillez entrer',
        },
        ru: {
            // Balance card
            totalBalance: 'Общий Баланс',
            availableToWithdraw: 'Доступно для вывода',
            watchAds: 'Смотреть Рекламу',
            completeTasks: 'Выполнять Задания',
            inviteFriends: 'Приглашать Друзей',
            // Ads page
            watchAndEarn: 'Смотри и Зарабатывай',
            adsCardDesc: 'Завершите и посмотрите короткое видео и зарабатывайте <strong>$0.30</strong>',
            watchAdBtn: 'Смотреть Рекламу',
            watchAdBtnSub: 'Досмотрите видео до конца, чтобы получить награду',
            readyToEarn: 'Готов к заработку',
            todaysAds: 'Реклама сегодня',
            dailyInfoSub: 'Смотрите до <strong>15 реклам в день</strong>.<br>Сбрасывается в полночь.',
            totalWatched: 'Всего просмотрено',
            adsUnit: 'реклам',
            rewardPerAd: 'Всего заработано',
            // Tasks page
            taskHeaderTitle: 'Выполняйте задания и получайте награды',
            joinChannels: 'Вступить в каналы',
            joinChannelsDesc: 'Зарабатывайте <strong>$0.10</strong> за каждый канал',
            startBots: 'Запустить ботов',
            startBotsDesc: 'Зарабатывайте <strong>$0.10</strong> за каждого бота',
            subscribeYoutube: 'Подписаться на канал',
            subscribeYoutubeDesc: 'Зарабатывайте <strong>$0.10</strong> за подписку',
            subscribeBtn: 'Подписаться',
            allYoutubeDone: 'Канал подписан!',
            progress: 'Прогресс',
            joinBtn: 'Вступить',
            startBtn: 'Запустить',
            allChannelsDone: 'Вы вступили во все каналы!',
            allBotsDone: 'Все боты запущены!',
            // Invite page
            inviteAndEarn: 'Приглашай и Зарабатывай',
            inviteHeroEarn: 'Зарабатывай <strong style="color:#374151;font-weight:800;">$0.75</strong> за каждое приглашение',
            inviteHeroSub: 'Скопируй и поделись своей реферальной ссылкой с друзьями, чтобы зарабатывать больше.',
            friendsInvited: 'Приглашено друзей',
            earnedFromInvites: 'Заработано с приглашений',
            yourInviteLink: 'Ваша реферальная ссылка',
            loading: 'Загрузка...',
            copy: 'Копировать',
            shareWithFriends: 'Поделиться с друзьями',
            howItWorks: 'Как это работает',
            step1Title: 'Скопируй и поделись',
            step1Desc: 'Скопируй свою уникальную реферальную ссылку и поделись ею с друзьями или в социальных сетях.',
            step2Title: 'Друг присоединяется',
            step2Desc: 'Твой друг открывает ссылку и запускает мини-приложение впервые.',
            step3Title: 'Ты зарабатываешь $0.75',
            step3Desc: '$0.75 мгновенно зачисляется на твой баланс. Каждый друг считается только один раз.',
            // Withdraw page
            minPopupTitle: 'Требуется минимум $10.00',
            minPopupDesc: 'Вам нужно не менее <strong>$10.00</strong> на балансе для вывода. Продолжайте смотреть рекламу и выполнять задания.',
            minPopupBtn: 'Понятно',
            paymentMethod: 'Способ оплаты',
            paymentMethodDesc: 'Выберите, как вы хотите получить выплату',
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'Сеть Tron · Без комиссий',
            paypalTitle: 'PayPal',
            paypalSub: 'Мгновенно на счёт PayPal',
            mobileTitle: 'Пополнение телефона',
            mobileSub: 'Прямо на номер телефона',
            amount: 'Сумма',
            amountPlaceholder: 'Введите сумму (напр. 10.00)',
            availableBalance: 'Доступный баланс:',
            minAmount: 'Мин $10.00',
            walletAddress: 'Адрес кошелька',
            walletPlaceholder: 'напр. TXyz...abc',
            walletHint: 'Введите адрес кошелька USDT TRC20',
            paypalEmail: 'Email PayPal',
            paypalPlaceholder: 'напр. you@email.com',
            paypalHint: 'Введите адрес электронной почты PayPal',
            phoneNumber: 'Номер телефона',
            phonePlaceholder: 'напр. +7 900 000 00 00',
            phoneHint: 'Введите номер мобильного телефона с кодом страны',
            submitWithdrawal: 'Отправить заявку на вывод',
            withdrawalRequirements: 'Условия вывода',
            withdrawalHistory: 'История выводов',
            processingTitle: 'Обработка...',
            processingDesc: 'Ваша заявка на вывод принята и обрабатывается. Пожалуйста, подождите.',
            successTitle: 'Выплата успешна!',
            // Requirements list
            reqBalanceTitle: 'Минимальный баланс $10.00',
            reqBalanceSub: (b) => `Ваш баланс: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'Готово' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: 'Пригласите 5 друзей',
            reqInvitesSub: (n) => `Приглашено друзей: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'Готово' : `${n} / 5`,
            reqTasksTitle: 'Выполните все задания',
            reqTasksSub: (done, total) => `Заданий выполнено: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'Готово' : `${done} / ${total}`,
            reqAdsTitle: 'Посмотрите 80 реклам',
            reqAdsSub: (n) => `Просмотрено реклам: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'Готово' : `${n} / 80`,
            // Nav
            navAds: 'Реклама',
            navTasks: 'Задания',
            navInvite: 'Друзья',
            navWithdraw: 'Вывод',
            // Dynamic messages
            loadingAd: 'Загрузка рекламы...',
            processingReward: 'Начисление награды...',
            adRewardAdded: '+$0.30 добавлено на ваш баланс!',
            waitNext: (s) => `Подождите ${s}с до следующей рекламы...`,
            adClosed: 'Реклама закрыта до окончания.',
            noAds: 'Сейчас нет доступной рекламы.',
            adError: 'Ошибка загрузки рекламы. Попробуйте снова.',
            linkCopied: 'Ссылка скопирована!',
            couldNotCopy: 'Не удалось скопировать ссылку',
            channelReward: '+$0.10 добавлено!',
            notJoinedYet: 'Вы ещё не вступили. Пожалуйста, вступите сначала.',
            channelError: 'Ошибка при проверке канала.',
            taskError: 'Ошибка при выполнении задания.',
            minWithdraw: 'Минимальная сумма вывода — $10.00',
            exceedsBalance: 'Сумма превышает ваш баланс',
            needInvites: 'Нужно пригласить не менее 5 друзей',
            completeAllTasks: 'Пожалуйста, сначала выполните все задания',
            needAds: 'Нужно посмотреть не менее 80 реклам',
            shareText: 'Присоединяйся к PayPlus и зарабатывай деньги, смотря короткую рекламу 📱\nСамый простой способ зарабатывать $100 в день 💰',
            // Validation
            validTRC20: 'Адрес USDT TRC20 действителен',
            invalidTRC20: 'Недействителен — адреса TRC20 начинаются с T и содержат 34 символа',
            validEmail: 'Email действителен',
            invalidEmail: 'Неверный формат email',
            validPhone: 'Номер телефона действителен',
            invalidPhone: 'Недействителен — используйте международный формат, напр. +7 900 000 00 00',
            minWithdrawError: 'Минимальная сумма вывода — $10.00',
            exceedsBalanceError: (b) => `Превышает ваш баланс $${b.toFixed(2)}`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — отлично`,
            enterValid: (m) => ({ crypto: 'действительный адрес USDT TRC20', paypal: 'действительный email PayPal', mobile: 'действительный международный номер телефона' }[m]),
            processingWithdrawDesc: (amount, method) => `Ваш вывод $${amount.toFixed(2)} через ${method} обрабатывается. Пожалуйста, подождите.`,
            successWithdrawDesc: (amount, method) => `Ваши $${amount.toFixed(2)} через ${method} отправлены. Проверьте свой счёт.`,
            processingBadge: 'Обработка',
            paidBadge: 'Выплачено',
            // Language button label
            langLabel: 'Русский',
            // Header
            supportBtnLabel: 'Поддержка',
            supportBtnMain: 'клиентов',
            langBtnTopLabel: 'Язык',
            // Earn toast
            rewardCredited: 'Награда зачислена',
            rewardAmount: '+ $0.30 заработано',
            // Ad progress
            today: 'сегодня',
            // Task done state
            done: 'Готово',
            // Ban screen
            banBadge: '⚠ Аккаунт Заблокирован',
            banTitle: 'Вы Заблокированы',
            banDesc: 'Ваш аккаунт был заблокирован администратором за нарушение наших правил и руководящих принципов сообщества.<br><br>Вы больше не можете получить доступ к PayPlus Rewards.',
            banBtn: 'Связаться с поддержкой',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'Выполните шаги ниже, чтобы разблокировать вывод средств.',
            dailyLimitReached: 'Достигнут дневной лимит в 15 рекламных объявлений. Вернитесь завтра!',
            pleaseEnter: 'Пожалуйста, введите',
        },
        pt: {
            // Balance card
            totalBalance: 'Saldo Total',
            availableToWithdraw: 'Disponível para saque',
            watchAds: 'Ver Anúncios',
            completeTasks: 'Completar Tarefas',
            inviteFriends: 'Convidar Amigos',
            // Ads page
            watchAndEarn: 'Assista e Ganhe',
            adsCardDesc: 'Complete e assista um anúncio de vídeo curto e ganhe <strong>$0.30</strong>',
            watchAdBtn: 'Ver Anúncio',
            watchAdBtnSub: 'Assista o vídeo completo para ganhar instantaneamente',
            readyToEarn: 'Pronto para ganhar',
            todaysAds: 'Anúncios de hoje',
            dailyInfoSub: 'Assista até <strong>15 anúncios por dia</strong>.<br>Reinicia à meia-noite.',
            totalWatched: 'Total assistido',
            adsUnit: 'anúncios',
            rewardPerAd: 'Total ganho',
            // Tasks page
            taskHeaderTitle: 'Complete tarefas e ganhe recompensas',
            joinChannels: 'Entrar nos canais',
            joinChannelsDesc: 'Ganhe <strong>$0.10</strong> por canal',
            startBots: 'Iniciar Bots',
            startBotsDesc: 'Ganhe <strong>$0.10</strong> por bot',
            subscribeYoutube: 'Assinar o canal',
            subscribeYoutubeDesc: 'Ganhe <strong>$0.10</strong> por assinatura',
            subscribeBtn: 'Assinar',
            allYoutubeDone: 'Canal assinado!',
            progress: 'Progresso',
            joinBtn: 'Entrar',
            startBtn: 'Iniciar',
            allChannelsDone: 'Você entrou em todos os canais!',
            allBotsDone: 'Todos os bots iniciados!',
            // Invite page
            inviteAndEarn: 'Convide e Ganhe',
            inviteHeroEarn: 'Ganhe <strong style="color:#374151;font-weight:800;">$0.75</strong> por cada convite',
            inviteHeroSub: 'Copie e compartilhe seu link de convite com amigos para ganhar mais.',
            friendsInvited: 'Amigos convidados',
            earnedFromInvites: 'Ganho de convites',
            yourInviteLink: 'Seu link de convite',
            loading: 'Carregando...',
            copy: 'Copiar',
            shareWithFriends: 'Compartilhar com amigos',
            howItWorks: 'Como funciona',
            step1Title: 'Copie e compartilhe',
            step1Desc: 'Copie seu link de convite único e compartilhe com amigos ou nas redes sociais.',
            step2Title: 'Seu amigo entra',
            step2Desc: 'Seu amigo abre o link e inicia o mini app pela primeira vez.',
            step3Title: 'Você ganha $0.75',
            step3Desc: '$0.75 é creditado instantaneamente no seu saldo. Cada amigo conta apenas uma vez.',
            // Withdraw page
            minPopupTitle: 'Mínimo de $10.00 necessário',
            minPopupDesc: 'Você precisa de pelo menos <strong>$10.00</strong> no saldo para sacar. Continue assistindo anúncios e completando tarefas.',
            minPopupBtn: 'Entendido',
            paymentMethod: 'Método de pagamento',
            paymentMethodDesc: 'Escolha como deseja receber seu pagamento',
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'Rede Tron · Sem taxas',
            paypalTitle: 'PayPal',
            paypalSub: 'Instantâneo para conta PayPal',
            mobileTitle: 'Recarga de Celular',
            mobileSub: 'Direto para o número de telefone',
            amount: 'Valor',
            amountPlaceholder: 'Digite o valor (ex. 10.00)',
            availableBalance: 'Saldo disponível:',
            minAmount: 'Mín $10.00',
            walletAddress: 'Endereço da carteira',
            walletPlaceholder: 'ex. TXyz...abc',
            walletHint: 'Digite seu endereço de carteira USDT TRC20',
            paypalEmail: 'Email do PayPal',
            paypalPlaceholder: 'ex. voce@email.com',
            paypalHint: 'Digite seu endereço de email do PayPal',
            phoneNumber: 'Número de telefone',
            phonePlaceholder: 'ex. +55 11 90000-0000',
            phoneHint: 'Digite seu número de celular com código do país',
            submitWithdrawal: 'Enviar pedido de saque',
            withdrawalRequirements: 'Requisitos de saque',
            withdrawalHistory: 'Histórico de saques',
            processingTitle: 'Processando...',
            processingDesc: 'Seu pedido de saque foi recebido e está sendo processado. Por favor aguarde.',
            successTitle: 'Pagamento realizado!',
            // Requirements list
            reqBalanceTitle: 'Saldo mínimo $10.00',
            reqBalanceSub: (b) => `Seu saldo: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'Pronto' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: 'Convide 5 amigos',
            reqInvitesSub: (n) => `Amigos convidados: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'Pronto' : `${n} / 5`,
            reqTasksTitle: 'Complete todas as tarefas',
            reqTasksSub: (done, total) => `Tarefas concluídas: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'Pronto' : `${done} / ${total}`,
            reqAdsTitle: 'Assista 80 anúncios',
            reqAdsSub: (n) => `Anúncios assistidos: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'Pronto' : `${n} / 80`,
            // Nav
            navAds: 'Anúncios',
            navTasks: 'Tarefas',
            navInvite: 'Convidar',
            navWithdraw: 'Sacar',
            // Dynamic messages
            loadingAd: 'Carregando anúncio...',
            processingReward: 'Processando recompensa...',
            adRewardAdded: '+$0.30 adicionado ao seu saldo!',
            waitNext: (s) => `Aguarde ${s}s antes do próximo anúncio...`,
            adClosed: 'Anúncio fechado antes de terminar.',
            noAds: 'Nenhum anúncio disponível agora.',
            adError: 'Erro ao carregar o anúncio. Tente novamente.',
            linkCopied: 'Link copiado!',
            couldNotCopy: 'Não foi possível copiar o link',
            channelReward: '+$0.10 adicionado!',
            notJoinedYet: 'Você ainda não entrou. Por favor entre primeiro.',
            channelError: 'Erro ao verificar o canal.',
            taskError: 'Erro ao completar a tarefa.',
            minWithdraw: 'O saque mínimo é $10.00',
            exceedsBalance: 'O valor excede seu saldo',
            needInvites: 'Você precisa convidar pelo menos 5 amigos',
            completeAllTasks: 'Por favor complete todas as tarefas primeiro',
            needAds: 'Você precisa assistir pelo menos 80 anúncios',
            shareText: 'Junte-se ao PayPlus para ganhar dinheiro assistindo anúncios curtos 📱\nA maneira mais fácil de ganhar $100 por dia 💰',
            // Validation
            validTRC20: 'Endereço USDT TRC20 válido',
            invalidTRC20: 'Inválido — endereços TRC20 começam com T e têm 34 caracteres',
            validEmail: 'Email válido',
            invalidEmail: 'Formato de email inválido',
            validPhone: 'Número de telefone válido',
            invalidPhone: 'Inválido — use o formato internacional, ex. +55 11 90000-0000',
            minWithdrawError: 'O valor mínimo de saque é $10.00',
            exceedsBalanceError: (b) => `Excede seu saldo de $${b.toFixed(2)}`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — parece bom`,
            enterValid: (m) => ({ crypto: 'um endereço USDT TRC20 válido', paypal: 'um email do PayPal válido', mobile: 'um número de telefone internacional válido' }[m]),
            processingWithdrawDesc: (amount, method) => `Seu saque de $${amount.toFixed(2)} via ${method} está sendo processado. Por favor aguarde.`,
            successWithdrawDesc: (amount, method) => `Seu $${amount.toFixed(2)} via ${method} foi enviado. Verifique sua conta.`,
            processingBadge: 'Processando',
            paidBadge: 'Pago',
            // Language button label
            langLabel: 'Português',
            // Header
            supportBtnLabel: 'Suporte',
            supportBtnMain: 'ao cliente',
            langBtnTopLabel: 'Idioma',
            // Earn toast
            rewardCredited: 'Recompensa creditada',
            rewardAmount: '+ $0.30 ganho',
            // Ad progress
            today: 'hoje',
            // Task done state
            done: 'Concluído',
            // Ban screen
            banBadge: '⚠ Conta Suspensa',
            banTitle: 'Você Foi Bloqueado',
            banDesc: 'Sua conta foi suspensa pelo administrador devido a uma violação das nossas regras e diretrizes da comunidade.<br><br>Você não pode mais acessar o PayPlus Rewards.',
            banBtn: 'Contactar suporte',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'Complete as etapas abaixo para desbloquear seu saque.',
            dailyLimitReached: 'Limite diário de 15 anúncios atingido. Volte amanhã!',
            pleaseEnter: 'Por favor, insira',
        },
        hi: {
            // Balance card
            totalBalance: 'कुल शेष राशि',
            availableToWithdraw: 'निकासी के लिए उपलब्ध',
            watchAds: 'विज्ञापन देखें',
            completeTasks: 'कार्य पूरे करें',
            inviteFriends: 'दोस्तों को आमंत्रित करें',
            // Ads page
            watchAndEarn: 'देखें और कमाएं',
            adsCardDesc: 'पूरा करें और एक छोटा वीडियो विज्ञापन देखें और <strong>$0.30</strong> कमाएं',
            watchAdBtn: 'विज्ञापन देखें',
            watchAdBtnSub: 'तुरंत कमाने के लिए वीडियो पूरा देखें',
            readyToEarn: 'कमाने के लिए तैयार',
            todaysAds: 'आज के विज्ञापन',
            dailyInfoSub: 'प्रतिदिन <strong>15 विज्ञापन तक</strong> देखें।<br>आधी रात को रीसेट होता है।',
            totalWatched: 'कुल देखे गए',
            adsUnit: 'विज्ञापन',
            rewardPerAd: 'कुल कमाई',
            // Tasks page
            taskHeaderTitle: 'कार्य पूरे करें और पुरस्कार पाएं',
            joinChannels: 'चैनल से जुड़ें',
            joinChannelsDesc: 'प्रति चैनल <strong>$0.10</strong> कमाएं',
            startBots: 'बॉट शुरू करें',
            startBotsDesc: 'प्रति बॉट <strong>$0.10</strong> कमाएं',
            subscribeYoutube: 'चैनल सब्सक्राइब करें',
            subscribeYoutubeDesc: 'प्रति सब्सक्रिप्शन <strong>$0.10</strong> कमाएं',
            subscribeBtn: 'सब्सक्राइब करें',
            allYoutubeDone: 'चैनल सब्सक्राइब हो गया!',
            progress: 'प्रगति',
            joinBtn: 'जुड़ें',
            startBtn: 'शुरू करें',
            allChannelsDone: 'आप सभी चैनलों से जुड़ गए!',
            allBotsDone: 'सभी बॉट शुरू हो गए!',
            // Invite page
            inviteAndEarn: 'आमंत्रित करें और कमाएं',
            inviteHeroEarn: 'प्रत्येक आमंत्रण के लिए <strong style="color:#374151;font-weight:800;">$0.75</strong> कमाएं',
            inviteHeroSub: 'अधिक कमाने के लिए अपना आमंत्रण लिंक कॉपी करें और दोस्तों के साथ शेयर करें।',
            friendsInvited: 'आमंत्रित दोस्त',
            earnedFromInvites: 'आमंत्रणों से कमाई',
            yourInviteLink: 'आपका आमंत्रण लिंक',
            loading: 'लोड हो रहा है...',
            copy: 'कॉपी करें',
            shareWithFriends: 'दोस्तों के साथ शेयर करें',
            howItWorks: 'यह कैसे काम करता है',
            step1Title: 'कॉपी करें और शेयर करें',
            step1Desc: 'अपना अनूठा आमंत्रण लिंक कॉपी करें और दोस्तों या सोशल मीडिया पर शेयर करें।',
            step2Title: 'आपका दोस्त जुड़ता है',
            step2Desc: 'आपका दोस्त लिंक खोलता है और पहली बार मिनी ऐप लॉन्च करता है।',
            step3Title: 'आप $0.75 कमाते हैं',
            step3Desc: '$0.75 तुरंत आपके शेष राशि में जुड़ जाता है। प्रत्येक दोस्त केवल एक बार गिना जाता है।',
            // Withdraw page
            minPopupTitle: 'न्यूनतम $10.00 आवश्यक',
            minPopupDesc: 'निकासी के लिए आपके शेष राशि में कम से कम <strong>$10.00</strong> होना चाहिए। विज्ञापन देखते रहें और कार्य पूरे करते रहें।',
            minPopupBtn: 'समझ गया',
            paymentMethod: 'भुगतान विधि',
            paymentMethodDesc: 'चुनें कि आप अपना भुगतान कैसे प्राप्त करना चाहते हैं',
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'Tron नेटवर्क · कोई शुल्क नहीं',
            paypalTitle: 'PayPal',
            paypalSub: 'PayPal खाते में तुरंत',
            mobileTitle: 'मोबाइल रिचार्ज',
            mobileSub: 'फोन नंबर पर सीधे',
            amount: 'राशि',
            amountPlaceholder: 'राशि दर्ज करें (जैसे 10.00)',
            availableBalance: 'उपलब्ध शेष:',
            minAmount: 'न्यूनतम $10.00',
            walletAddress: 'वॉलेट पता',
            walletPlaceholder: 'जैसे TXyz...abc',
            walletHint: 'अपना USDT TRC20 वॉलेट पता दर्ज करें',
            paypalEmail: 'PayPal ईमेल',
            paypalPlaceholder: 'जैसे you@email.com',
            paypalHint: 'अपना PayPal ईमेल पता दर्ज करें',
            phoneNumber: 'फोन नंबर',
            phonePlaceholder: 'जैसे +91 98000 00000',
            phoneHint: 'देश कोड के साथ अपना मोबाइल नंबर दर्ज करें',
            submitWithdrawal: 'निकासी अनुरोध जमा करें',
            withdrawalRequirements: 'निकासी की शर्तें',
            withdrawalHistory: 'निकासी इतिहास',
            processingTitle: 'प्रोसेसिंग...',
            processingDesc: 'आपका निकासी अनुरोध प्राप्त हो गया है और प्रोसेस किया जा रहा है। कृपया प्रतीक्षा करें।',
            successTitle: 'भुगतान सफल!',
            // Requirements list
            reqBalanceTitle: 'न्यूनतम शेष $10.00',
            reqBalanceSub: (b) => `आपका शेष: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'तैयार' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: '5 दोस्तों को आमंत्रित करें',
            reqInvitesSub: (n) => `आमंत्रित दोस्त: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'तैयार' : `${n} / 5`,
            reqTasksTitle: 'सभी कार्य पूरे करें',
            reqTasksSub: (done, total) => `पूरे किए गए कार्य: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'तैयार' : `${done} / ${total}`,
            reqAdsTitle: '80 विज्ञापन देखें',
            reqAdsSub: (n) => `देखे गए विज्ञापन: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'तैयार' : `${n} / 80`,
            // Nav
            navAds: 'विज्ञापन',
            navTasks: 'कार्य',
            navInvite: 'आमंत्रित',
            navWithdraw: 'निकासी',
            // Dynamic messages
            loadingAd: 'विज्ञापन लोड हो रहा है...',
            processingReward: 'पुरस्कार प्रोसेस हो रहा है...',
            adRewardAdded: '+$0.30 आपके शेष में जुड़ गया!',
            waitNext: (s) => `अगले विज्ञापन से पहले ${s}s प्रतीक्षा करें...`,
            adClosed: 'विज्ञापन समाप्त होने से पहले बंद कर दिया गया।',
            noAds: 'अभी कोई विज्ञापन उपलब्ध नहीं है।',
            adError: 'विज्ञापन लोड करने में त्रुटि। फिर से प्रयास करें।',
            linkCopied: 'लिंक कॉपी हो गया!',
            couldNotCopy: 'लिंक कॉपी नहीं हो सका',
            channelReward: '+$0.10 जुड़ गया!',
            notJoinedYet: 'आप अभी तक नहीं जुड़े। पहले जुड़ें।',
            channelError: 'चैनल सत्यापन में त्रुटि।',
            taskError: 'कार्य पूरा करने में त्रुटि।',
            minWithdraw: 'न्यूनतम निकासी $10.00 है',
            exceedsBalance: 'राशि आपके शेष से अधिक है',
            needInvites: 'आपको कम से कम 5 दोस्तों को आमंत्रित करना होगा',
            completeAllTasks: 'पहले सभी कार्य पूरे करें',
            needAds: 'आपको कम से कम 80 विज्ञापन देखने होंगे',
            shareText: 'PayPlus से जुड़ें और छोटे वीडियो विज्ञापन देखकर पैसे कमाएं 📱\nरोज़ $100 कमाने का सबसे आसान तरीका 💰',
            // Validation
            validTRC20: 'USDT TRC20 पता मान्य है',
            invalidTRC20: 'अमान्य — TRC20 पते T से शुरू होते हैं और 34 अक्षर लंबे होते हैं',
            validEmail: 'ईमेल मान्य है',
            invalidEmail: 'अमान्य ईमेल प्रारूप',
            validPhone: 'फोन नंबर मान्य है',
            invalidPhone: 'अमान्य — अंतरराष्ट्रीय प्रारूप उपयोग करें, जैसे +91 98000 00000',
            minWithdrawError: 'न्यूनतम निकासी राशि $10.00 है',
            exceedsBalanceError: (b) => `आपके शेष $${b.toFixed(2)} से अधिक है`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — बढ़िया है`,
            enterValid: (m) => ({ crypto: 'एक मान्य USDT TRC20 पता', paypal: 'एक मान्य PayPal ईमेल', mobile: 'एक मान्य अंतरराष्ट्रीय फोन नंबर' }[m]),
            processingWithdrawDesc: (amount, method) => `$${amount.toFixed(2)} का ${method} के माध्यम से आपका निकासी अनुरोध प्रोसेस हो रहा है। कृपया प्रतीक्षा करें।`,
            successWithdrawDesc: (amount, method) => `${method} के माध्यम से आपका $${amount.toFixed(2)} भेज दिया गया। अपना खाता जांचें।`,
            processingBadge: 'प्रोसेसिंग',
            paidBadge: 'भुगतान हुआ',
            // Language button label
            langLabel: 'हिन्दी',
            // Header
            supportBtnLabel: 'सहायता',
            supportBtnMain: 'ग्राहक',
            langBtnTopLabel: 'भाषा',
            // Earn toast
            rewardCredited: 'पुरस्कार जुड़ गया',
            rewardAmount: '+ $0.30 कमाया',
            // Ad progress
            today: 'आज',
            // Task done state
            done: 'हो गया',
            // Ban screen
            banBadge: '⚠ खाता निलंबित',
            banTitle: 'आपको ब्लॉक कर दिया गया है',
            banDesc: 'हमारे नियमों और सामुदायिक दिशा-निर्देशों के उल्लंघन के कारण प्रशासक द्वारा आपका खाता निलंबित कर दिया गया है।<br><br>आप अब PayPlus Rewards तक पहुंच नहीं सकते।',
            banBtn: 'सहायता से संपर्क करें',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'निकासी अनलॉक करने के लिए नीचे दिए गए चरण पूरे करें।',
            dailyLimitReached: '15 विज्ञापनों की दैनिक सीमा पहुँच गई। कल वापस आएं!',
            pleaseEnter: 'कृपया दर्ज करें',
        },
        id: {
            // Balance card
            totalBalance: 'Total Saldo',
            availableToWithdraw: 'Tersedia untuk Penarikan',
            watchAds: 'Tonton Iklan',
            completeTasks: 'Selesaikan Tugas',
            inviteFriends: 'Undang Teman',
            // Ads page
            watchAndEarn: 'Tonton & Dapatkan',
            adsCardDesc: 'Selesaikan dan tonton iklan video singkat dan dapatkan <strong>$0.30</strong>',
            watchAdBtn: 'Tonton Iklan',
            watchAdBtnSub: 'Tonton video hingga selesai untuk langsung mendapatkan hadiah',
            readyToEarn: 'Siap menghasilkan',
            todaysAds: 'Iklan hari ini',
            dailyInfoSub: 'Tonton hingga <strong>15 iklan per hari</strong>.<br>Diperbarui tengah malam.',
            totalWatched: 'Total ditonton',
            adsUnit: 'iklan',
            rewardPerAd: 'Total pendapatan',
            // Tasks page
            taskHeaderTitle: 'Selesaikan tugas dan dapatkan hadiah',
            joinChannels: 'Bergabung ke saluran',
            joinChannelsDesc: 'Dapatkan <strong>$0.10</strong> per saluran',
            startBots: 'Mulai Bot',
            startBotsDesc: 'Dapatkan <strong>$0.10</strong> per bot',
            subscribeYoutube: 'Berlangganan saluran',
            subscribeYoutubeDesc: 'Dapatkan <strong>$0.10</strong> per langganan',
            subscribeBtn: 'Berlangganan',
            allYoutubeDone: 'Saluran dilanggani!',
            progress: 'Progres',
            joinBtn: 'Bergabung',
            startBtn: 'Mulai',
            allChannelsDone: 'Anda telah bergabung ke semua saluran!',
            allBotsDone: 'Semua bot telah dimulai!',
            // Invite page
            inviteAndEarn: 'Undang & Dapatkan',
            inviteHeroEarn: 'Dapatkan <strong style="color:#374151;font-weight:800;">$0.75</strong> per undangan',
            inviteHeroSub: 'Salin dan bagikan tautan undangan Anda ke teman untuk mendapatkan lebih banyak.',
            friendsInvited: 'Teman diundang',
            earnedFromInvites: 'Penghasilan dari undangan',
            yourInviteLink: 'Tautan undangan Anda',
            loading: 'Memuat...',
            copy: 'Salin',
            shareWithFriends: 'Bagikan ke teman',
            howItWorks: 'Cara kerjanya',
            step1Title: 'Salin & bagikan',
            step1Desc: 'Salin tautan undangan unik Anda dan bagikan ke teman atau media sosial.',
            step2Title: 'Teman Anda bergabung',
            step2Desc: 'Teman Anda membuka tautan dan meluncurkan mini app untuk pertama kali.',
            step3Title: 'Anda mendapat $0.75',
            step3Desc: '$0.75 langsung dikreditkan ke saldo Anda. Setiap teman hanya dihitung sekali.',
            // Withdraw page
            minPopupTitle: 'Minimum $10.00 diperlukan',
            minPopupDesc: 'Anda membutuhkan setidaknya <strong>$10.00</strong> di saldo untuk menarik. Terus tonton iklan dan selesaikan tugas.',
            minPopupBtn: 'Mengerti',
            paymentMethod: 'Metode pembayaran',
            paymentMethodDesc: 'Pilih cara Anda ingin menerima pembayaran',
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'Jaringan Tron · Tanpa biaya',
            paypalTitle: 'PayPal',
            paypalSub: 'Instan ke akun PayPal',
            mobileTitle: 'Pulsa Ponsel',
            mobileSub: 'Langsung ke nomor telepon',
            amount: 'Jumlah',
            amountPlaceholder: 'Masukkan jumlah (mis. 10.00)',
            availableBalance: 'Saldo tersedia:',
            minAmount: 'Min $10.00',
            walletAddress: 'Alamat dompet',
            walletPlaceholder: 'mis. TXyz...abc',
            walletHint: 'Masukkan alamat dompet USDT TRC20 Anda',
            paypalEmail: 'Email PayPal',
            paypalPlaceholder: 'mis. anda@email.com',
            paypalHint: 'Masukkan alamat email PayPal Anda',
            phoneNumber: 'Nomor telepon',
            phonePlaceholder: 'mis. +62 812 0000 0000',
            phoneHint: 'Masukkan nomor ponsel Anda dengan kode negara',
            submitWithdrawal: 'Kirim permintaan penarikan',
            withdrawalRequirements: 'Syarat penarikan',
            withdrawalHistory: 'Riwayat penarikan',
            processingTitle: 'Memproses...',
            processingDesc: 'Permintaan penarikan Anda telah diterima dan sedang diproses. Harap tunggu.',
            successTitle: 'Pembayaran berhasil!',
            // Requirements list
            reqBalanceTitle: 'Saldo minimum $10.00',
            reqBalanceSub: (b) => `Saldo Anda: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'Siap' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: 'Undang 5 teman',
            reqInvitesSub: (n) => `Teman diundang: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'Siap' : `${n} / 5`,
            reqTasksTitle: 'Selesaikan semua tugas',
            reqTasksSub: (done, total) => `Tugas selesai: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'Siap' : `${done} / ${total}`,
            reqAdsTitle: 'Tonton 80 iklan',
            reqAdsSub: (n) => `Iklan ditonton: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'Siap' : `${n} / 80`,
            // Nav
            navAds: 'Iklan',
            navTasks: 'Tugas',
            navInvite: 'Undang',
            navWithdraw: 'Tarik',
            // Dynamic messages
            loadingAd: 'Memuat iklan...',
            processingReward: 'Memproses hadiah...',
            adRewardAdded: '+$0.30 ditambahkan ke saldo Anda!',
            waitNext: (s) => `Tunggu ${s}d sebelum iklan berikutnya...`,
            adClosed: 'Iklan ditutup sebelum selesai.',
            noAds: 'Tidak ada iklan yang tersedia sekarang.',
            adError: 'Gagal memuat iklan. Coba lagi.',
            linkCopied: 'Tautan disalin!',
            couldNotCopy: 'Tidak dapat menyalin tautan',
            channelReward: '+$0.10 ditambahkan!',
            notJoinedYet: 'Anda belum bergabung. Silakan bergabung terlebih dahulu.',
            channelError: 'Kesalahan saat memverifikasi saluran.',
            taskError: 'Kesalahan saat menyelesaikan tugas.',
            minWithdraw: 'Penarikan minimum adalah $10.00',
            exceedsBalance: 'Jumlah melebihi saldo Anda',
            needInvites: 'Anda perlu mengundang setidaknya 5 teman',
            completeAllTasks: 'Harap selesaikan semua tugas terlebih dahulu',
            needAds: 'Anda perlu menonton setidaknya 80 iklan',
            shareText: 'Bergabunglah ke PayPlus dan hasilkan uang dengan menonton iklan pendek 📱\nCara termudah untuk menghasilkan $100 per hari 💰',
            // Validation
            validTRC20: 'Alamat USDT TRC20 valid',
            invalidTRC20: 'Tidak valid — alamat TRC20 dimulai dengan T dan memiliki 34 karakter',
            validEmail: 'Email valid',
            invalidEmail: 'Format email tidak valid',
            validPhone: 'Nomor telepon valid',
            invalidPhone: 'Tidak valid — gunakan format internasional, mis. +62 812 0000 0000',
            minWithdrawError: 'Jumlah penarikan minimum adalah $10.00',
            exceedsBalanceError: (b) => `Melebihi saldo Anda $${b.toFixed(2)}`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — bagus`,
            enterValid: (m) => ({ crypto: 'alamat USDT TRC20 yang valid', paypal: 'email PayPal yang valid', mobile: 'nomor telepon internasional yang valid' }[m]),
            processingWithdrawDesc: (amount, method) => `Penarikan $${amount.toFixed(2)} Anda melalui ${method} sedang diproses. Harap tunggu.`,
            successWithdrawDesc: (amount, method) => `$${amount.toFixed(2)} Anda melalui ${method} telah dikirim. Periksa akun Anda.`,
            processingBadge: 'Memproses',
            paidBadge: 'Dibayar',
            // Language button label
            langLabel: 'Indonesia',
            // Header
            supportBtnLabel: 'Dukungan',
            supportBtnMain: 'pelanggan',
            langBtnTopLabel: 'Bahasa',
            // Earn toast
            rewardCredited: 'Hadiah dikreditkan',
            rewardAmount: '+ $0.30 diperoleh',
            // Ad progress
            today: 'hari ini',
            // Task done state
            done: 'Selesai',
            // Ban screen
            banBadge: '⚠ Akun Ditangguhkan',
            banTitle: 'Anda Telah Diblokir',
            banDesc: 'Akun Anda telah ditangguhkan oleh administrator karena melanggar aturan dan pedoman komunitas kami.<br><br>Anda tidak lagi dapat mengakses PayPlus Rewards.',
            banBtn: 'Hubungi dukungan',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'Selesaikan langkah-langkah di bawah untuk membuka penarikan Anda.',
            dailyLimitReached: 'Batas harian 15 iklan tercapai. Kembali besok!',
            pleaseEnter: 'Mohon masukkan',
        },
        tr: {
            // Balance card
            totalBalance: 'Toplam Bakiye',
            availableToWithdraw: 'Çekilebilir Bakiye',
            watchAds: 'Reklam İzle',
            completeTasks: 'Görevleri Tamamla',
            inviteFriends: 'Arkadaş Davet Et',
            // Ads page
            watchAndEarn: 'İzle ve Kazan',
            adsCardDesc: 'Tamamla ve kısa bir video reklamı izle ve <strong>$0.30</strong> kazan',
            watchAdBtn: 'Reklam İzle',
            watchAdBtnSub: 'Anında kazanmak için videoyu sonuna kadar izle',
            readyToEarn: 'Kazanmaya hazır',
            todaysAds: 'Bugünün reklamları',
            dailyInfoSub: 'Günde <strong>15 reklama kadar</strong> izle.<br>Gece yarısı sıfırlanır.',
            totalWatched: 'Toplam izlenen',
            adsUnit: 'reklam',
            rewardPerAd: 'Toplam kazanılan',
            // Tasks page
            taskHeaderTitle: 'Görevleri tamamla ve ödül kazan',
            joinChannels: 'Kanallara katıl',
            joinChannelsDesc: 'Kanal başına <strong>$0.10</strong> kazan',
            startBots: 'Botları Başlat',
            startBotsDesc: 'Bot başına <strong>$0.10</strong> kazan',
            subscribeYoutube: 'Kanala abone ol',
            subscribeYoutubeDesc: 'Abonelik başına <strong>$0.10</strong> kazan',
            subscribeBtn: 'Abone Ol',
            allYoutubeDone: 'Kanala abone olundu!',
            progress: 'İlerleme',
            joinBtn: 'Katıl',
            startBtn: 'Başlat',
            allChannelsDone: 'Tüm kanallara katıldınız!',
            allBotsDone: 'Tüm botlar başlatıldı!',
            // Invite page
            inviteAndEarn: 'Davet Et ve Kazan',
            inviteHeroEarn: 'Her davet için <strong style="color:#374151;font-weight:800;">$0.75</strong> kazan',
            inviteHeroSub: 'Daha fazla kazanmak için davet bağlantınızı kopyalayın ve arkadaşlarınızla paylaşın.',
            friendsInvited: 'Davet edilen arkadaşlar',
            earnedFromInvites: 'Davetlerden kazanılan',
            yourInviteLink: 'Davet bağlantınız',
            loading: 'Yükleniyor...',
            copy: 'Kopyala',
            shareWithFriends: 'Arkadaşlarla paylaş',
            howItWorks: 'Nasıl çalışır',
            step1Title: 'Kopyala ve paylaş',
            step1Desc: 'Benzersiz davet bağlantınızı kopyalayın ve arkadaşlarınıza veya sosyal medyada paylaşın.',
            step2Title: 'Arkadaşınız katılır',
            step2Desc: 'Arkadaşınız bağlantıyı açar ve mini uygulamayı ilk kez başlatır.',
            step3Title: '$0.75 kazanırsınız',
            step3Desc: '$0.75 anında bakiyenize eklenir. Her arkadaş yalnızca bir kez sayılır.',
            // Withdraw page
            minPopupTitle: 'Minimum $10.00 gerekli',
            minPopupDesc: 'Çekim yapmak için bakiyenizde en az <strong>$10.00</strong> olması gerekiyor. Reklam izlemeye ve görev tamamlamaya devam edin.',
            minPopupBtn: 'Anladım',
            paymentMethod: 'Ödeme yöntemi',
            paymentMethodDesc: 'Ödemenizi nasıl almak istediğinizi seçin',
            cryptoTitle: 'USDT TRC20',
            cryptoSub: 'Tron ağı · Ücretsiz',
            paypalTitle: 'PayPal',
            paypalSub: 'PayPal hesabına anında',
            mobileTitle: 'Mobil Yükleme',
            mobileSub: 'Doğrudan telefon numarasına',
            amount: 'Miktar',
            amountPlaceholder: 'Miktar girin (örn. 10.00)',
            availableBalance: 'Mevcut bakiye:',
            minAmount: 'Min $10.00',
            walletAddress: 'Cüzdan adresi',
            walletPlaceholder: 'örn. TXyz...abc',
            walletHint: 'USDT TRC20 cüzdan adresinizi girin',
            paypalEmail: 'PayPal e-postası',
            paypalPlaceholder: 'örn. siz@email.com',
            paypalHint: 'PayPal e-posta adresinizi girin',
            phoneNumber: 'Telefon numarası',
            phonePlaceholder: 'örn. +90 555 000 0000',
            phoneHint: 'Ülke koduyla birlikte telefon numaranızı girin',
            submitWithdrawal: 'Çekim talebini gönder',
            withdrawalRequirements: 'Çekim şartları',
            withdrawalHistory: 'Çekim geçmişi',
            processingTitle: 'İşleniyor...',
            processingDesc: 'Çekim talebiniz alındı ve işleniyor. Lütfen bekleyin.',
            successTitle: 'Ödeme başarılı!',
            // Requirements list
            reqBalanceTitle: 'Minimum bakiye $10.00',
            reqBalanceSub: (b) => `Bakiyeniz: $${b.toFixed(2)}`,
            reqBalanceBadge: (b) => b >= 10 ? 'Hazır' : `$${b.toFixed(2)} / $10.00`,
            reqInvitesTitle: '5 arkadaş davet et',
            reqInvitesSub: (n) => `Davet edilen arkadaşlar: ${n}`,
            reqInvitesBadge: (n) => n >= 5 ? 'Hazır' : `${n} / 5`,
            reqTasksTitle: 'Tüm görevleri tamamla',
            reqTasksSub: (done, total) => `Tamamlanan görevler: ${done} / ${total}`,
            reqTasksBadge: (done, total) => done >= total ? 'Hazır' : `${done} / ${total}`,
            reqAdsTitle: '80 reklam izle',
            reqAdsSub: (n) => `İzlenen reklamlar: ${n}`,
            reqAdsBadge: (n) => n >= 80 ? 'Hazır' : `${n} / 80`,
            // Nav
            navAds: 'Reklamlar',
            navTasks: 'Görevler',
            navInvite: 'Davet',
            navWithdraw: 'Çek',
            // Dynamic messages
            loadingAd: 'Reklam yükleniyor...',
            processingReward: 'Ödül işleniyor...',
            adRewardAdded: '+$0.30 bakiyenize eklendi!',
            waitNext: (s) => `Sonraki reklamdan önce ${s}s bekleyin...`,
            adClosed: 'Reklam bitmeden kapatıldı.',
            noAds: 'Şu an mevcut reklam yok.',
            adError: 'Reklam yüklenirken hata oluştu. Tekrar deneyin.',
            linkCopied: 'Bağlantı kopyalandı!',
            couldNotCopy: 'Bağlantı kopyalanamadı',
            channelReward: '+$0.10 eklendi!',
            notJoinedYet: 'Henüz katılmadınız. Lütfen önce katılın.',
            channelError: 'Kanal doğrulanırken hata oluştu.',
            taskError: 'Görev tamamlanırken hata oluştu.',
            minWithdraw: 'Minimum çekim $10.00\'dır',
            exceedsBalance: 'Miktar bakiyenizi aşıyor',
            needInvites: 'En az 5 arkadaş davet etmeniz gerekiyor',
            completeAllTasks: 'Lütfen önce tüm görevleri tamamlayın',
            needAds: 'En az 80 reklam izlemeniz gerekiyor',
            shareText: 'PayPlus\'a katılın ve kısa video reklamları izleyerek para kazanın 📱\nGünde $100 kazanmanın en kolay yolu 💰',
            // Validation
            validTRC20: 'USDT TRC20 adresi geçerli',
            invalidTRC20: 'Geçersiz — TRC20 adresleri T ile başlar ve 34 karakter uzunluğundadır',
            validEmail: 'E-posta geçerli',
            invalidEmail: 'Geçersiz e-posta formatı',
            validPhone: 'Telefon numarası geçerli',
            invalidPhone: 'Geçersiz — uluslararası format kullanın, örn. +90 555 000 0000',
            minWithdrawError: 'Minimum çekim miktarı $10.00\'dır',
            exceedsBalanceError: (b) => `Bakiyeniz $${b.toFixed(2)}'yi aşıyor`,
            amountLooksGood: (v) => `$${v.toFixed(2)} — harika`,
            enterValid: (m) => ({ crypto: 'geçerli bir USDT TRC20 adresi', paypal: 'geçerli bir PayPal e-postası', mobile: 'geçerli bir uluslararası telefon numarası' }[m]),
            processingWithdrawDesc: (amount, method) => `${method} aracılığıyla $${amount.toFixed(2)} çekiminiz işleniyor. Lütfen bekleyin.`,
            successWithdrawDesc: (amount, method) => `${method} aracılığıyla $${amount.toFixed(2)}'niz gönderildi. Hesabınızı kontrol edin.`,
            processingBadge: 'İşleniyor',
            paidBadge: 'Ödendi',
            // Language button label
            langLabel: 'Türkçe',
            // Header
            supportBtnLabel: 'Destek',
            supportBtnMain: 'müşteri',
            langBtnTopLabel: 'Dil',
            // Earn toast
            rewardCredited: 'Ödül eklendi',
            rewardAmount: '+ $0.30 kazanıldı',
            // Ad progress
            today: 'bugün',
            // Task done state
            done: 'Tamamlandı',
            // Ban screen
            banBadge: '⚠ Hesap Askıya Alındı',
            banTitle: 'Engellendiniz',
            banDesc: 'Hesabınız, kurallarımızı ve topluluk yönergelerimizi ihlal ettiğiniz için yönetici tarafından askıya alınmıştır.<br><br>PayPlus Rewards\'a artık erişemezsiniz.',
            banBtn: 'Destekle iletişime geç',
            // Withdrawal unlock sub-text
            withdrawUnlockSub: 'Çekiminizin kilidini açmak için aşağıdaki adımları tamamlayın.',
            dailyLimitReached: 'Günlük 15 reklam limitine ulaşıldı. Yarın tekrar gel!',
            pleaseEnter: 'Lütfen girin',
        }
    };

    // Active language
    let currentLang = 'en';

    // Get translation value
    function t(key) {
        const tr = translations[currentLang];
        return (tr && tr[key] !== undefined) ? tr[key] : (translations.en[key] || key);
    }

    // Apply current language to all static UI elements
    function applyLang() {
        const lang = currentLang;
        const html = document.documentElement;

        // RTL / LTR
        if (lang === 'fa' || lang === 'ar') {
            html.setAttribute('dir', 'rtl');
            html.setAttribute('lang', lang);
        } else {
            html.setAttribute('dir', 'ltr');
            html.setAttribute('lang', lang);
        }

        // Language button
        document.getElementById('langBtnLabel').textContent = t('langLabel');

        // Balance card
        document.getElementById('balanceLabelEl').textContent    = t('totalBalance');
        document.getElementById('balanceSubtitleEl').textContent = t('availableToWithdraw');
        document.getElementById('earnItemAds').textContent       = t('watchAds');
        document.getElementById('earnItemTasks').textContent     = t('completeTasks');
        document.getElementById('earnItemInvite').textContent    = t('inviteFriends');

        // Ads page
        document.getElementById('adsCardTitle').textContent      = t('watchAndEarn');
        document.getElementById('adsCardDesc').innerHTML         = t('adsCardDesc');
        document.getElementById('watchAdBtnText').textContent    = t('watchAdBtn');
        document.getElementById('watchAdBtnSub').textContent     = t('watchAdBtnSub');
        document.getElementById('todaysAdsLabel').textContent    = t('todaysAds');
        document.getElementById('dailyInfoSub').innerHTML        = t('dailyInfoSub');
        document.getElementById('totalWatchedLabel').textContent = t('totalWatched');
        document.getElementById('adsUnitLabel').textContent      = t('adsUnit');
        document.getElementById('rewardPerAdLabel').textContent  = t('rewardPerAd');

        // Update ad status text if it's the default "ready" state
        const adStatusText = document.getElementById('adStatusText');
        if (adStatusDiv.classList.contains('info') && (adStatusText.textContent === translations.en.readyToEarn || adStatusText.textContent === translations.fa.readyToEarn)) {
            adStatusText.textContent = t('readyToEarn');
        }

        // Tasks page
        document.getElementById('taskWrapperTitle').textContent  = t('taskHeaderTitle');
        document.getElementById('joinChannelsTitle').textContent = t('joinChannels');
        document.getElementById('joinChannelsDesc').innerHTML    = t('joinChannelsDesc');
        document.getElementById('chProgressLabel').textContent   = t('progress');
        document.getElementById('startBotsTitle').textContent    = t('startBots');
        document.getElementById('startBotsDesc').innerHTML       = t('startBotsDesc');
        document.getElementById('botProgressLabel').textContent  = t('progress');
        document.getElementById('subscribeYoutubeTitle').textContent = t('subscribeYoutube');
        document.getElementById('subscribeYoutubeDesc').innerHTML    = t('subscribeYoutubeDesc');
        document.getElementById('ytProgressLabel').textContent       = t('progress');

        // Invite page
        document.getElementById('inviteHeroTitle').textContent         = t('inviteAndEarn');
        document.getElementById('inviteHeroEarn').innerHTML           = t('inviteHeroEarn');
        document.getElementById('inviteHeroSub').textContent          = t('inviteHeroSub');
        document.getElementById('friendsInvitedLabel').textContent    = t('friendsInvited');
        document.getElementById('earnedFromInvitesLabel').textContent = t('earnedFromInvites');
        document.getElementById('yourInviteLinkTitle').textContent    = t('yourInviteLink');
        const inviteLinkEl = document.getElementById('inviteLink');
        if (inviteLinkEl.textContent === translations.en.loading || inviteLinkEl.textContent === translations.fa.loading) {
            inviteLinkEl.textContent = t('loading');
        }
        document.getElementById('copyBtnText').textContent        = t('copy');
        document.getElementById('shareInviteBtnText').textContent = t('shareWithFriends');

        // Withdraw page – popup
        document.getElementById('wdMinPopupTitle').textContent   = t('minPopupTitle');
        document.getElementById('wdMinPopupDesc').innerHTML      = t('minPopupDesc');
        document.getElementById('wdMinPopupBtn').textContent     = t('minPopupBtn');

        // Withdraw – payment method card
        document.getElementById('paymentMethodTitle').textContent = t('paymentMethod');
        document.getElementById('paymentMethodDesc').textContent  = t('paymentMethodDesc');
        document.getElementById('cryptoTitle').textContent        = t('cryptoTitle');
        document.getElementById('cryptoSub').textContent          = t('cryptoSub');
        document.getElementById('paypalTitle').textContent        = t('paypalTitle');
        document.getElementById('paypalSub').textContent          = t('paypalSub');
        document.getElementById('mobileTitle').textContent        = t('mobileTitle');
        document.getElementById('mobileSub').textContent          = t('mobileSub');

        // Withdraw – amount/destination card
        document.getElementById('amountLabel').textContent      = t('amount');
        document.getElementById('wdAmountInput').placeholder    = t('amountPlaceholder');
        document.getElementById('availBalanceLabel').textContent = t('availableBalance');
        document.getElementById('minAmountLabel').textContent   = t('minAmount');
        document.getElementById('submitWithdrawText').textContent = t('submitWithdrawal');

        // Withdraw – conditions/history labels
        document.getElementById('wdConditionsLabel').textContent = t('withdrawalRequirements');
        document.getElementById('wdHistoryLabel').textContent   = t('withdrawalHistory');
        document.getElementById('wdUnlockSub').textContent      = t('withdrawUnlockSub');

        // Header – support & language button labels
        document.getElementById('supportBtnLabel').textContent = t('supportBtnLabel');
        document.getElementById('supportBtnMain').textContent  = t('supportBtnMain');
        document.getElementById('langBtnTopLabel').textContent = t('langBtnTopLabel');

        // Earn toast labels
        document.getElementById('earnToastLabel').textContent = t('rewardCredited');
        document.getElementById('earnToastAmount').textContent = t('rewardAmount');

        // Ban screen
        document.getElementById('banBadge').textContent = t('banBadge');
        document.getElementById('banTitle').textContent  = t('banTitle');
        document.getElementById('banDesc').innerHTML     = t('banDesc');
        document.getElementById('banBtn').textContent    = t('banBtn');

        // Withdraw – status box (if shown)
        const wdStatusTitle = document.getElementById('wdStatusTitle');
        const wdStatusDesc = document.getElementById('wdStatusDesc');
        if (wdStatusTitle.textContent === translations.en.processingTitle || wdStatusTitle.textContent === translations.fa.processingTitle) {
            wdStatusTitle.textContent = t('processingTitle');
            wdStatusDesc.textContent  = t('processingDesc');
        }

        // Nav labels
        document.getElementById('navAdsLabel').textContent      = t('navAds');
        document.getElementById('navTasksLabel').textContent    = t('navTasks');
        document.getElementById('navInviteLabel').textContent   = t('navInvite');
        document.getElementById('navWithdrawLabel').textContent = t('navWithdraw');

        // Re-apply method-specific destination labels for current selected method
        applyMethodLabels(wdSelectedMethod);

        // Re-render tasks so Join/Start buttons get correct label
        if (typeof renderTasks === 'function' && channelsDone !== undefined) {
            renderTasks(
                channels.slice(0, channelsDone).map(c => c.id),
                bots.slice(0, botsDone).map(b => b.id)
            );
        }

        // Re-render withdraw requirements if visible
        if (document.getElementById('wd-conditions').style.display !== 'none') {
            renderReqList({
                b: wdUserData.balance,
                invites: wdUserData.totalInvites,
                adsWatched: wdUserData.totalAdsWatched,
                tasksDone: (wdUserData.completedChannels || []).length + (wdUserData.completedBots || []).length,
                totalTasks: channels.length + bots.length,
                allTasksDone: (wdUserData.completedChannels || []).length + (wdUserData.completedBots || []).length >= channels.length + bots.length
            });
        }

        // Update language modal active state
        document.getElementById('langOptEn').classList.toggle('active', lang === 'en');
        document.getElementById('langOptFa').classList.toggle('active', lang === 'fa');
        document.getElementById('langOptEs').classList.toggle('active', lang === 'es');
        document.getElementById('langOptAr').classList.toggle('active', lang === 'ar');
        document.getElementById('langOptFr').classList.toggle('active', lang === 'fr');
        document.getElementById('langOptRu').classList.toggle('active', lang === 'ru');
        document.getElementById('langOptPt').classList.toggle('active', lang === 'pt');
        document.getElementById('langOptHi').classList.toggle('active', lang === 'hi');
        document.getElementById('langOptId').classList.toggle('active', lang === 'id');
        document.getElementById('langOptTr').classList.toggle('active', lang === 'tr');
    }

    // Helper: apply method-specific destination labels
    function applyMethodLabels(method) {
        const labels = {
            crypto: { label: t('walletAddress') || 'USDT TRC20 Address', hint: t('walletHint') || 'Enter your USDT (TRC-20, BEP-20, or TON) address', ph: t('walletPlaceholder') || 'e.g. TXyz...abc' },
            upi:    { label: 'UPI ID / VPA', hint: 'Google Pay, PhonePe, Paytm, or BHIM VPA', ph: 'e.g. username@okhdfcbank or 9876543210@paytm' },
            paypal: { label: t('paypalEmail') || 'PayPal Email', hint: t('paypalHint') || 'Instant payout to PayPal account', ph: t('paypalPlaceholder') || 'name@example.com' },
            mobile: { label: t('phoneNumber') || 'Phone Number', hint: t('phoneHint') || 'Phone number with country code & operator', ph: t('phonePlaceholder') || '+91 9876543210 (Jio/Airtel)' },
            pubg:   { label: 'Player ID / UID', hint: 'PUBG Mobile Character ID or Free Fire UID', ph: 'e.g. 5123456789' }
        };
        const l = labels[method] || labels.crypto;
        const destLabel = document.getElementById('wdDestLabel');
        const destHint  = document.getElementById('wdDestHint');
        const destInput = document.getElementById('wdDestInput');
        if (destLabel) destLabel.textContent = l.label;
        if (destHint)  destHint.textContent  = l.hint;
        if (destInput) destInput.placeholder = l.ph;
    }

    // ── Language modal ──────────────────────────────────────
    function openLangModal() {
        document.getElementById('langModal').classList.add('open');
    }
    function closeLangModal(e) {
        if (e.target === document.getElementById('langModal')) {
            document.getElementById('langModal').classList.remove('open');
        }
    }

    async function setLang(lang) {
        document.getElementById('langModal').classList.remove('open');
        if (lang === currentLang) return;
        // Save to database only — no localStorage
        try {
            await fetch('/api/set-language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData: tg.initData, language: lang })
            });
        } catch (e) { /* silent */ }
        // Full page reload so every UI element re-renders cleanly in the new language
        location.reload();
    }

    // ── User data & tab state ──────────────────────────────
    let channels = [], bots = [];
    let channelsDone = 0, botsDone = 0, youtubeDone = 0;

    // Switch tab
    function switchTab(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
        if (page === 'withdraw') renderWithdrawPage();
    }

    // ── Toast ──────────────────────────────────────────────
    function showToast(msg, type) {
        const isError = type === 'error';
        const isCopy  = type === 'copy';
        const isWarn  = type === 'warn';
        const c = document.getElementById('toastContainer');
        const d = document.createElement('div');
        d.className = 'toast';
        const icon = isError
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px;flex-shrink:0;"><circle cx="12" cy="12" r="10" stroke="rgba(255,200,200,0.7)" stroke-width="1.8"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
            : isCopy
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px;flex-shrink:0;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
            : isWarn
            ? `<svg viewBox="0 0 24 24" fill="none" style="width:17px;height:17px;flex-shrink:0;"><path d="M12 3L22 20H2L12 3Z" fill="rgba(212,175,55,0.20)" stroke="rgba(212,175,55,0.90)" stroke-width="1.8" stroke-linejoin="round"/><rect x="11.1" y="9.5" width="1.8" height="5.5" rx="0.9" fill="rgba(212,175,55,0.92)"/><circle cx="12" cy="17" r="1.1" fill="rgba(212,175,55,0.95)"/></svg>`
            : `✦`;
        const label = isError ? 'Task Not Done' : isCopy ? 'Copied' : isWarn ? 'Withdrawal Requirements' : 'Task Done';
        const typeClass = isError ? ' error' : isCopy ? ' copy' : isWarn ? ' warn' : '';
        d.innerHTML = `
            <div class="toast-inner${typeClass}">
                <div class="toast-icon">${icon}</div>
                <div class="toast-text">
                    <div class="toast-label">${label}</div>
                    <div class="toast-msg">${msg}</div>
                </div>
                <div class="toast-bar-wrap"><div class="toast-bar"></div></div>
            </div>`;
        c.appendChild(d);
        setTimeout(() => d.remove(), 2600);
    }

    // ── Earn toast ─────────────────────────────────────────
    let earnToastTimer = null;
    function showEarnToast() {
        const toast = document.getElementById('earn-toast');
        const bar   = document.getElementById('earnToastBar');
        if (!toast) return;
        if (earnToastTimer) { clearTimeout(earnToastTimer); earnToastTimer = null; }
        toast.className = '';
        void toast.offsetWidth;
        toast.className = 'show';
        if (bar) {
            bar.style.transition = 'none';
            bar.style.width = '100%';
            void bar.offsetWidth;
            bar.style.transition = 'width 3s linear';
            bar.style.width = '0%';
        }
        earnToastTimer = setTimeout(() => {
            toast.className = 'hide';
            setTimeout(() => { toast.className = ''; }, 320);
            earnToastTimer = null;
        }, 3000);
    }

    // ── Ad status helper ───────────────────────────────────
    function showAdStatus(msg, type) {
        adStatusDiv.className = `status-msg ${type}`;
        adStatusDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span id="adStatusText">${msg}</span>`;
    }

    // ── Daily progress bar (replaces ring) ─────────────────
    function updateDailyRing(count) {
        const pct = Math.min(count / DAILY_LIMIT, 1);
        const fill  = document.getElementById('adProgressFill');
        const label = document.getElementById('adProgressLabel');
        if (fill)  fill.style.width = (pct * 100) + '%';
        if (label) label.textContent = `${count} / ${DAILY_LIMIT} ${t('today')}`;
        if (fill) {
            fill.style.background = count >= DAILY_LIMIT
                ? 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)'
                : 'linear-gradient(90deg, #c0c0c0 0%, #e8e8e8 50%, #a8a8a8 100%)';
        }
    }

    // ── Midnight countdown for daily ad limit ──
    let midnightCountdownInterval = null;
    function startMidnightCountdown() {
        const playIcon      = document.getElementById('watchAdPlayIcon');
        const countdownSpan = document.getElementById('watchAdCountdown');
        if (!playIcon || !countdownSpan) return;

        playIcon.style.display      = 'none';
        countdownSpan.style.display = 'block';

        function getTimeUntilMidnight() {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const diff = Math.max(0, Math.floor((midnight - now) / 1000));
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }

        countdownSpan.textContent = getTimeUntilMidnight();

        if (midnightCountdownInterval) clearInterval(midnightCountdownInterval);
        midnightCountdownInterval = setInterval(() => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const diff = Math.max(0, Math.floor((midnight - now) / 1000));
            if (diff === 0) {
                clearInterval(midnightCountdownInterval);
                midnightCountdownInterval = null;
                countdownSpan.style.display = 'none';
                playIcon.style.display      = '';
                watchBtn.disabled = false;
                return;
            }
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            countdownSpan.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 1000);
    }

    // ── Map a Telegram language_code to one of our supported codes ──
    function mapTgLang(tgLang) {
        const supported = ['en', 'fa', 'es', 'ar', 'fr', 'ru', 'pt', 'hi', 'id', 'tr'];
        const map = { fa: 'fa', ar: 'ar', es: 'es', fr: 'fr', ru: 'ru', pt: 'pt', hi: 'hi', id: 'id', tr: 'tr' };
        const prefix = (tgLang || '').toLowerCase().slice(0, 2);
        return map[prefix] || 'en';
    }

    // ── High-CPC TADS TGB 13007 Integration ────────────────
    function initTadsTGB() {
        const container = document.getElementById('tads-container-13007');
        if (!container) return;
        if (window.tads && typeof window.tads.init === 'function') {
            try {
                const tgb = window.tads.init({
                    widgetId: 13007,
                    type: 'static',
                    debug: false,
                    onClickReward: (adId) => {
                        console.log('TGB ad clicked:', adId);
                    },
                    onAdsNotFound: () => {
                        container.innerHTML = '<div style="font-size:11px;color:#777;padding:12px;text-align:center;">Sponsored Partner Offers Available Soon</div>';
                    }
                });
                tgb.loadAd().then(() => tgb.showAd()).catch(() => {});
            } catch (e) {
                console.warn('TGB init error:', e);
            }
        } else {
            let tries = 0;
            const iv = setInterval(() => {
                tries++;
                if (window.tads && typeof window.tads.init === 'function') {
                    clearInterval(iv);
                    initTadsTGB();
                } else if (tries > 25) {
                    clearInterval(iv);
                }
            }, 200);
        }
    }

    // ── Load user data ─────────────────────────────────────
    async function loadUserData() {
        const user = tg.initDataUnsafe?.user || {};
        const userId = user.id;
        const tgLang = user.language_code || 'en';
        const detectedLang = mapTgLang(tgLang);

        // Apply Telegram language instantly before DB response arrives (no flicker)
        currentLang = detectedLang;
        applyLang();

        // Display user info
        const name = user.first_name || 'User';
        const displayName = name.length > 12 ? name.slice(0, 12) + '…' : name;
        userNameEl.textContent = displayName;
        userChatIdEl.textContent = `ID: ${user.id || '—'}`;
        userAvatarText.textContent = name.charAt(0).toUpperCase();
        if (user.photo_url) {
            userAvatarImg.src = user.photo_url;
            userAvatarImg.style.display = 'block';
            userAvatarText.style.display = 'none';
        }

        // Get referral from URL
        const startParam   = tg.initDataUnsafe?.start_param || '';
        const referralUserId = startParam || null;

        try {
            const res  = await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData: tg.initData, referralUserId, telegramLang: detectedLang })
            });
            const data = await res.json();
            if (!res.ok) return;

            // Show ban screen and block all access if user is banned
            if (data.banned) {
                const banScreen = document.getElementById('ban-screen');
                banScreen.style.display = 'flex';
                return;
            }

            // DB language is the authoritative source — always apply it
            // (DB is set from Telegram language on first join, and updated when user manually changes it)
            if (data.language && ['en', 'fa', 'es', 'ar', 'fr', 'ru', 'pt', 'hi', 'id', 'tr'].includes(data.language)) {
                if (currentLang !== data.language) {
                    currentLang = data.language;
                    applyLang();
                }
            }

            balanceDiv.textContent = `$${data.balance.toFixed(2)}`;
            totalAdsEl.innerHTML   = `${data.totalAdsWatched} <span id="adsUnitLabel">${t('adsUnit')}</span>`;
            if (totalEarnedEl) totalEarnedEl.textContent = `$${(data.totalAdsWatched * 0.30).toFixed(2)}`;
            updateDailyRing(data.adsToday || 0);

            wdUserData = {
                balance: data.balance,
                totalInvites: data.totalInvites,
                totalAdsWatched: data.totalAdsWatched,
                completedChannels: data.completedChannels || [],
                completedBots: data.completedBots || [],
                withdrawals: data.withdrawals || []
            };

            // Mount high-CPC TADS TGB 13007 into DOM
            initTadsTGB();

            try {
                const tcRes  = await fetch('/api/tasks-config');
                const tcData = await tcRes.json();
                channels = tcData.channels || [];
                bots     = tcData.bots     || [];
            } catch (e) {
                channels = [];
                bots     = [];
            }

            renderTasks(data.completedChannels || [], data.completedBots || [], data.completedYoutube || []);

            // Invite link — fetch bot username dynamically
            (async () => {
                let botUsername = 'AiMusicCreaterBot';
                try {
                    const bi = await fetch('/api/bot-info');
                    const bd = await bi.json();
                    if (bd.username) botUsername = bd.username;
                } catch (e) {}
                document.getElementById('inviteLink').textContent =
                    `https://t.me/${botUsername}/app?startapp=${data.telegramId}`;
            })();

            document.getElementById('totalInvites').textContent = data.totalInvites || 0;
            const earned = ((data.totalInvites || 0) * 0.75).toFixed(2);
            document.getElementById('totalEarnedFromInvites').textContent = `$${earned}`;

            // Request write access so the bot can message this user.
            // Safe to call every time — if already granted, Telegram calls back instantly (no popup).
            // Only marks botGreeted:true in DB after the message is actually sent successfully.
            if (tg.requestWriteAccess) {
                tg.requestWriteAccess((granted) => {
                    if (granted && !data.botGreeted) {
                        fetch('/api/send-bot-welcome', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ initData: tg.initData })
                        }).catch(() => {});
                    }
                });
            }

            if (data.adsToday >= DAILY_LIMIT) {
                watchBtn.disabled = true;
                showAdStatus(t('dailyLimitReached'), 'warning');
                startMidnightCountdown();
            }

        } catch (err) {
            console.error('Failed to load user data:', err);
        }
    }

    // ── Copy / Share invite ────────────────────────────────
    document.getElementById('copyInviteBtn').addEventListener('click', () => {
        const url = document.getElementById('inviteLink').textContent;
        if (!url || url === t('loading')) return;
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => showToast(t('linkCopied'), 'copy')).catch(() => fallbackCopy(url));
        } else { fallbackCopy(url); }
    });

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); showToast(t('linkCopied'), 'copy'); }
        catch { showToast(t('couldNotCopy')); }
        document.body.removeChild(ta);
    }

    document.getElementById('shareInviteBtn').addEventListener('click', () => {
        const url  = document.getElementById('inviteLink').textContent;
        if (!url || url === t('loading')) return;
        const text = t('shareText');
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        tg.openTelegramLink ? tg.openTelegramLink(shareUrl) : tg.openLink(shareUrl);
    });

    // ── Task rendering ─────────────────────────────────────
    function renderTasks(completedChannels, completedBots, completedYoutube) {
        channelsDone = completedChannels.length;
        botsDone     = completedBots.length;
        youtubeDone  = (completedYoutube || []).length;

        // Channels
        document.getElementById('channelProgressCount').textContent = `${channelsDone} / ${channels.length}`;
        document.getElementById('channelProgressBar').style.width   = `${(channelsDone / channels.length) * 100}%`;
        const chBtn = document.getElementById('joinChannelBtn');
        if (channelsDone >= channels.length) {
            chBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-right:4px;flex-shrink:0"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t('done')}`;
            chBtn.disabled = true;
            chBtn.style.opacity = '0.55';
            chBtn.onclick = null;
        } else {
            const ch = channels[channelsDone];
            chBtn.textContent = t('joinBtn');
            chBtn.disabled = false;
            chBtn.style.opacity = '';
            chBtn.onclick = () => joinChannel(ch.username, ch.id);
        }

        // Bots
        document.getElementById('botProgressCount').textContent = `${botsDone} / ${bots.length}`;
        document.getElementById('botProgressBar').style.width   = `${(botsDone / bots.length) * 100}%`;
        const botBtn = document.getElementById('startBotBtn');
        if (botsDone >= bots.length) {
            botBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-right:4px;flex-shrink:0"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t('done')}`;
            botBtn.disabled = true;
            botBtn.style.opacity = '0.55';
            botBtn.onclick = null;
        } else {
            const bot = bots[botsDone];
            botBtn.textContent = t('startBtn');
            botBtn.disabled = false;
            botBtn.style.opacity = '';
            botBtn.onclick = () => startBot(bot.username, bot.id);
        }

        // YouTube
        const ytChannels = [{ id: 'kaliboy002_yt', url: 'https://www.youtube.com/@PayPlusNews' }];
        document.getElementById('ytProgressCount').textContent = `${youtubeDone} / ${ytChannels.length}`;
        document.getElementById('ytProgressBar').style.width   = `${(youtubeDone / ytChannels.length) * 100}%`;
        const ytBtn = document.getElementById('subscribeYoutubeBtn');
        if (youtubeDone >= ytChannels.length) {
            ytBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-right:4px;flex-shrink:0"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t('done')}`;
            ytBtn.disabled = true;
            ytBtn.style.opacity = '0.55';
            ytBtn.onclick = null;
        } else {
            const ytCh = ytChannels[youtubeDone];
            ytBtn.textContent = t('subscribeBtn');
            ytBtn.disabled = false;
            ytBtn.style.opacity = '';
            ytBtn.onclick = () => subscribeYoutube(ytCh.url, ytCh.id);
        }
    }

    // ── YouTube Subscribe action ───────────────────────────
    function subscribeYoutube(url, youtubeId) {
        tg.openLink ? tg.openLink(url) : window.open(url, '_blank');
        setTimeout(() => completeYoutubeTask(youtubeId), 1500);
    }

    async function completeYoutubeTask(youtubeId) {
        try {
            const res  = await fetch('/api/complete-youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData: tg.initData, youtubeId })
            });
            const data = await res.json();
            if (data.success) {
                balanceDiv.textContent = `$${data.balance.toFixed(2)}`;
                showToast(t('channelReward'));
                youtubeDone++;
                renderTasks(
                    channels.slice(0, channelsDone).map(c => c.id),
                    bots.slice(0, botsDone).map(b => b.id),
                    Array(youtubeDone).fill('kaliboy002_yt')
                );
            } else {
                showToast(t('allYoutubeDone'));
            }
        } catch { showToast(t('taskError'), 'error'); }
    }

    // ── Channel & Bot actions ──────────────────────────────
    function joinChannel(username, channelId) {
        tg.openLink(`https://t.me/${username}`);
        setTimeout(() => verifyChannel(channelId), 1500);
    }

    async function verifyChannel(channelId) {
        try {
            const res  = await fetch('/api/verify-channel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData: tg.initData, channelId })
            });
            const data = await res.json();
            if (data.success) {
                balanceDiv.textContent = `$${data.balance.toFixed(2)}`;
                showToast(t('channelReward'));
                channelsDone++;
                renderTasks(channels.slice(0, channelsDone).map(c => c.id), bots.slice(0, botsDone).map(b => b.id));
            } else {
                showToast(t('notJoinedYet'), 'error');
            }
        } catch { showToast(t('channelError'), 'error'); }
    }

    function startBot(username, botId) {
        tg.openLink(`https://t.me/${username}`);
        setTimeout(() => completeBotTask(botId), 1500);
    }

    async function completeBotTask(botId) {
        try {
            const res  = await fetch('/api/complete-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData: tg.initData, botId })
            });
            const data = await res.json();
            if (data.success) {
                balanceDiv.textContent = `$${data.balance.toFixed(2)}`;
                showToast(t('channelReward'));
                botsDone++;
                renderTasks(channels.slice(0, channelsDone).map(c => c.id), bots.slice(0, botsDone).map(b => b.id));
            }
        } catch { showToast(t('taskError'), 'error'); }
    }

    // ── Helper: Dark Backdrop for Fullscreen Ads ─────────
    function setAdDarkBackdrop(visible) {
        const bd = document.getElementById('ad-dark-backdrop');
        if (bd) bd.style.display = visible ? 'block' : 'none';
    }

    // ── Helper: Play TADS Fullscreen Rewarded Video (Widget 13008) ──
    function playTadsFullscreen() {
        return new Promise((resolve, reject) => {
            if (!window.tads || typeof window.tads.init !== 'function') {
                return reject(new Error('no_tads_sdk'));
            }
            let finished = false;
            setAdDarkBackdrop(true);

            try {
                const controller = window.tads.init({
                    widgetId: 13008,
                    type: 'fullscreen',
                    debug: false,
                    onShowReward: (adId) => {
                        finished = true;
                        setAdDarkBackdrop(false);
                        resolve({ type: 'tads_fullscreen', adId });
                    },
                    onAdsNotFound: () => {
                        setAdDarkBackdrop(false);
                        if (!finished) reject(new Error('no_ads'));
                    }
                });

                controller.showAd().catch(err => {
                    setAdDarkBackdrop(false);
                    if (!finished) reject(err || new Error('no_ads'));
                });
            } catch (e) {
                setAdDarkBackdrop(false);
                reject(e);
            }
        });
    }

    // ── Helper: Play GigaPub Video (Project 8839) ─────────
    function playGigaPubVideo() {
        return new Promise(async (resolve, reject) => {
            if (typeof window.showGiga !== 'function') {
                return reject(new Error('no_gigapub'));
            }
            setAdDarkBackdrop(true);
            try {
                await window.showGiga();
                setAdDarkBackdrop(false);
                resolve({ type: 'gigapub' });
            } catch (err) {
                setAdDarkBackdrop(false);
                reject(err);
            }
        });
    }

    // ── Watch Ad Multi-Network Cascade ──────────────────────
    watchBtn.onclick = async function () {
        watchBtn.disabled = true;
        showAdStatus(t('loadingAd'), 'info');

        let adCompleted = false;
        let adNetwork = 'tads_fullscreen';

        // 1. First attempt TADS Fullscreen Rewarded Ad (Widget 13008)
        try {
            await playTadsFullscreen();
            adCompleted = true;
            adNetwork = 'tads_fullscreen';
        } catch (tadsErr) {
            console.warn('TADS fullscreen unavailable, attempting GigaPub:', tadsErr);
            // 2. Cascade to GigaPub Rewarded Video (Project 8839)
            try {
                await playGigaPubVideo();
                adCompleted = true;
                adNetwork = 'gigapub';
            } catch (gigaErr) {
                console.warn('GigaPub unavailable, routing to 10s Sponsor Exploration:', gigaErr);
                // 3. Fallback to Guaranteed High-Payout 10-Second Sponsor Exploration
                const user = tg.initDataUnsafe?.user || {};
                const uId = user.id || 'demo_user';
                window.location.href = `/ad.html?userId=${uId}`;
                return;
            }
        }

        if (adCompleted) {
            showAdStatus(t('processingReward'), 'info');
            try {
                const res  = await fetch('/api/reward', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initData: tg.initData, adType: adNetwork })
                });
                const data = await res.json();
                if (data.balance !== undefined) {
                    balanceDiv.textContent = `$${data.balance.toFixed(2)}`;
                    totalAdsEl.innerHTML   = `${data.totalAdsWatched} <span id="adsUnitLabel">${t('adsUnit')}</span>`;
                    if (totalEarnedEl) totalEarnedEl.textContent = `$${(data.totalAdsWatched * 0.30).toFixed(2)}`;
                    updateDailyRing(data.adsToday);
                    showAdStatus(t('adRewardAdded'), 'success');
                    showEarnToast();
                    if (tg?.HapticFeedback) {
                        try { tg.HapticFeedback.notificationOccurred('success'); } catch (_) {}
                    }
                    if (data.adsToday >= DAILY_LIMIT) {
                        watchBtn.disabled = true;
                        showAdStatus(t('dailyLimitReached'), 'warning');
                        startMidnightCountdown();
                    } else {
                        await cooldown(3);
                    }
                } else {
                    showAdStatus(data.limitReached ? t('dailyLimitReached') : (data.error || 'Something went wrong.'), data.limitReached ? 'warning' : 'error');
                    if (data.limitReached) { startMidnightCountdown(); }
                    else watchBtn.disabled = false;
                }
            } catch (err) {
                showAdStatus(t('adError'), 'error');
                watchBtn.disabled = false;
            }
        }
    };

    function cooldown(secs) {
        return new Promise(resolve => {
            let r = secs;
            const tick = () => {
                if (r <= 0) { watchBtn.disabled = false; showAdStatus(t('readyToEarn'), 'info'); resolve(); }
                else { showAdStatus(t('waitNext')(r), 'info'); r--; setTimeout(tick, 1000); }
            };
            tick();
        });
    }

    // ── Withdraw page state ────────────────────────────────
    let wdUserData = { balance: 0, totalInvites: 0, totalAdsWatched: 0, completedChannels: [], completedBots: [], withdrawals: [] };
    let wdSelectedMethod = 'crypto';
    let wdSubmitted = false;

    function renderWithdrawPage() {
        const b              = wdUserData.balance;
        const invites        = wdUserData.totalInvites;
        const adsWatched     = wdUserData.totalAdsWatched;
        const chDone         = (wdUserData.completedChannels || []).length;
        const botDone        = (wdUserData.completedBots || []).length;
        const totalTasks     = channels.length + bots.length;
        const tasksDone      = chDone + botDone;
        const allTasksDone   = tasksDone >= totalTasks;

        if (wdSubmitted) {
            document.getElementById('wd-form').style.display        = 'none';
            document.getElementById('wd-conditions').style.display  = 'none';
            document.getElementById('wd-status').style.display      = 'flex';
            renderWithdrawHistory();
            return;
        }

        document.getElementById('wd-form').style.display   = 'flex';
        document.getElementById('wd-status').style.display = 'none';
        document.getElementById('wdAvailBalance').textContent = `$${b.toFixed(2)}`;

        if (b >= 10) {
            document.getElementById('wd-conditions').style.display = 'flex';
            renderReqList({ b, invites, adsWatched, tasksDone, totalTasks, allTasksDone });
        } else {
            document.getElementById('wd-conditions').style.display = 'none';
        }

        renderWithdrawHistory();
    }

    function renderReqList({ b, invites, adsWatched, tasksDone, totalTasks, allTasksDone }) {
        const container = document.getElementById('wdReqList');
        const reqs = [
            {
                met: b >= 10,
                icon: dollarIcon(),
                title: t('reqBalanceTitle'),
                sub: t('reqBalanceSub')(b),
                badge: t('reqBalanceBadge')(b)
            },
            {
                met: invites >= 10,
                icon: peopleIcon(),
                title: t('reqInvitesTitle'),
                sub: `${invites} / 10 invites`,
                badge: `${invites}/10`
            },
            {
                met: allTasksDone,
                icon: checklistIcon(),
                title: t('reqTasksTitle'),
                sub: t('reqTasksSub')(tasksDone, totalTasks),
                badge: t('reqTasksBadge')(tasksDone, totalTasks)
            },
            {
                met: adsWatched >= 30,
                icon: playIcon(),
                title: t('reqAdsTitle'),
                sub: `${adsWatched} / 30 ads watched`,
                badge: `${adsWatched}/30`
            }
        ];

        container.innerHTML = reqs.map(r => `
            <div class="req-row ${r.met ? 'met' : 'unmet'}">
                <div class="req-icon ${r.met ? 'green-bg' : 'red-bg'}">${r.met ? tickIcon() : r.icon}</div>
                <div class="req-body">
                    <div class="req-title">${r.title}</div>
                    <div class="req-sub">${r.sub}</div>
                </div>
                <span class="req-badge ${r.met ? 'ok' : 'no'}">${r.badge}</span>
            </div>
        `).join('');
    }

    // ── Method selection ───────────────────────────────────
    function selectMethod(el) {
        document.querySelectorAll('.method-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        wdSelectedMethod = el.dataset.method;
        applyMethodLabels(wdSelectedMethod);
        document.getElementById('wdDestInput').value = '';
        document.getElementById('wdDestInput').style.borderColor = '';
        setFeedback('wdDestFeedback', false, null);
    }

    // ── Input validation helpers ───────────────────────────
    function normalizePhone(value) {
        return value.replace(/[\s\-().]/g, '');
    }
    function isValidDest(value, method) {
        if (!value) return false;
        const v = value.trim();
        if (method === 'crypto') return /^(T[1-9A-HJ-NP-Za-km-z]{33}|0x[a-fA-F0-9]{40}|UQ[0-9a-zA-Z_-]{46})$/.test(v);
        if (method === 'upi')    return /^[\w.-]+@[\w.-]+$/.test(v);
        if (method === 'paypal') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
        if (method === 'mobile') return /^\+?[1-9]\d{6,14}$/.test(normalizePhone(v));
        if (method === 'pubg')   return /^[0-9]{5,15}$/.test(v);
        return v.length >= 3;
    }

    function setFeedback(elId, ok, msg) { }

    function validateAmountInput() {
        const val = parseFloat(document.getElementById('wdAmountInput').value);
        const b   = wdUserData.balance;
        const inp = document.getElementById('wdAmountInput');
        if (!val) { setFeedback('wdAmountFeedback', false, null); inp.style.borderColor = ''; return; }
        if (val < 10) {
            setFeedback('wdAmountFeedback', false, t('minWithdrawError') || 'Minimum withdrawal is $10.00');
            inp.style.borderColor = '#fca5a5';
        } else if (val > b) {
            setFeedback('wdAmountFeedback', false, t('exceedsBalanceError')(b));
            inp.style.borderColor = '#fca5a5';
        } else {
            setFeedback('wdAmountFeedback', true, t('amountLooksGood')(val));
            inp.style.borderColor = '#86efac';
        }
    }

    function validateDestInput() {
        const val = document.getElementById('wdDestInput').value.trim();
        const inp = document.getElementById('wdDestInput');
        if (!val) { setFeedback('wdDestFeedback', false, null); inp.style.borderColor = ''; return; }
        const ok = isValidDest(val, wdSelectedMethod);
        const msgs = {
            crypto: ok ? (t('validTRC20') || 'Valid USDT Address') : (t('invalidTRC20') || 'Invalid USDT Address (TRC20/BEP20/TON)'),
            upi:    ok ? 'Valid UPI ID' : 'Please enter valid UPI ID (e.g. name@okhdfcbank)',
            paypal: ok ? (t('validEmail') || 'Valid PayPal Email') : (t('invalidEmail') || 'Invalid email address'),
            mobile: ok ? (t('validPhone') || 'Valid Phone Number') : (t('invalidPhone') || 'Invalid phone number (+CountryCode)'),
            pubg:   ok ? 'Valid Player ID' : 'Please enter numeric Player ID (5-15 digits)'
        };
        setFeedback('wdDestFeedback', ok, msgs[wdSelectedMethod] || 'Invalid format');
        inp.style.borderColor = ok ? '#86efac' : '#fca5a5';
    }

    // ── Submit withdrawal ──────────────────────────────────
    async function submitWithdraw() {
        const amount = parseFloat(document.getElementById('wdAmountInput').value);
        const rawDest = document.getElementById('wdDestInput').value.trim();
        const dest    = wdSelectedMethod === 'mobile' ? normalizePhone(rawDest) : rawDest;
        const b      = wdUserData.balance;

        if (b < 10) {
            document.getElementById('wd-min-popup').style.display = 'flex';
            return;
        }
        if (!amount || amount < 10) { showToast(t('minWithdraw') || 'Minimum withdrawal is $10.00', 'warn'); return; }
        if (amount > b)            { showToast(t('exceedsBalance'), 'warn'); return; }
        if (!dest || !isValidDest(dest, wdSelectedMethod)) {
            validateDestInput();
            showToast(`${t('pleaseEnter')} valid details`, 'warn');
            return;
        }

        const invites      = wdUserData.totalInvites;
        const adsWatched   = wdUserData.totalAdsWatched;
        const chDone       = (wdUserData.completedChannels || []).length;
        const botDone      = (wdUserData.completedBots || []).length;
        const allTasksDone = (chDone + botDone) >= (channels.length + bots.length);

        if (invites < 10)   { showToast('You need at least 10 invites to unlock withdrawals.', 'warn'); return; }
        if (!allTasksDone)  { showToast(t('completeAllTasks'), 'warn'); return; }
        if (adsWatched < 30) { showToast('You must watch at least 30 ads to unlock withdrawals.', 'warn'); return; }

        wdSubmitted = true;

        const box      = document.getElementById('wdStatusBox');
        const amountEl = document.getElementById('wdStatusAmount');
        const titleEl  = document.getElementById('wdStatusTitle');
        const descEl   = document.getElementById('wdStatusDesc');
        const iconEl   = document.getElementById('wdStatusIcon');
        const methodName = {
            crypto: 'USDT TRC20',
            upi:    'UPI / VPA',
            paypal: 'PayPal',
            mobile: t('mobileTitle') || 'Mobile Recharge',
            pubg:   'PUBG UC / Free Fire'
        }[wdSelectedMethod] || wdSelectedMethod;

        document.getElementById('wd-form').style.display       = 'none';
        document.getElementById('wd-conditions').style.display = 'none';
        document.getElementById('wd-status').style.display     = 'flex';

        amountEl.textContent = `$${amount.toFixed(2)}`;
        box.className        = 'wd-status-box pending';
        titleEl.textContent  = t('processingTitle');
        descEl.textContent   = t('processingWithdrawDesc')(amount, methodName);
        iconEl.innerHTML     = `<path d="M21 12a9 9 0 1 1-6.219-8.56"/>`;
        iconEl.classList.add('spinner');

        try {
            const resp = await fetch('/api/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData: window.Telegram?.WebApp?.initData || '', amount, method: wdSelectedMethod, destination: dest })
            });
            const data = await resp.json();
            if (resp.ok) {
                wdUserData.balance = data.newBalance;
                if (data.withdrawal) wdUserData.withdrawals.unshift(data.withdrawal);
                document.querySelectorAll('.balance-amount').forEach(el => el.textContent = `$${data.newBalance.toFixed(2)}`);
            }
        } catch (e) { console.error('Withdraw API error', e); }

        setTimeout(() => {
            box.className        = 'wd-status-box success';
            titleEl.textContent  = t('successTitle');
            descEl.textContent   = t('successWithdrawDesc')(amount, methodName);
            iconEl.classList.remove('spinner');
            iconEl.innerHTML     = `<polyline points="20 6 9 17 4 12" stroke-width="2.5"/>`;
            if (wdUserData.withdrawals && wdUserData.withdrawals.length > 0) {
                wdUserData.withdrawals[0].status = 'done';
            }
            renderWithdrawHistory();
        }, 30000);

        renderWithdrawHistory();
    }

    function renderWithdrawHistory() {
        const list = wdUserData.withdrawals || [];
        if (!list.length) return;
        const methodLabels = { crypto: 'USDT TRC20', paypal: 'PayPal', mobile: t('mobileTitle') };
        document.getElementById('wd-history').style.display = 'block';
        document.getElementById('wdHistoryList').innerHTML = list.map(w => {
            const date    = new Date(w.date);
            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const label   = methodLabels[w.method] || w.method;
            const ageMs   = Date.now() - new Date(w.date).getTime();
            const isPaid  = w.status === 'done' || ageMs > 30000;
            const badge   = isPaid
                ? `<span class="wd-history-badge done">${t('paidBadge')}</span>`
                : `<span class="wd-history-badge processing">${t('processingBadge')}</span>`;
            return `
            <div class="wd-history-row">
                <div>
                    <div class="wd-history-label">${label}</div>
                    <div class="wd-history-sub">${dateStr} · ${w.destination.length > 16 ? w.destination.slice(0,14)+'…' : w.destination}</div>
                    ${badge}
                </div>
                <div class="wd-history-amount">-$${parseFloat(w.amount).toFixed(2)}</div>
            </div>`;
        }).join('');
    }

    // ── Small SVG helpers for req list ─────────────────────
    function tickIcon()      { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; }
    function dollarIcon()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`; }
    function peopleIcon()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; }
    function checklistIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`; }
    function playIcon()      { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>`; }

    // ── Splash hide ────────────────────────────────────────
    function hideSplash() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 600);
        }
    }

    // ── Init ───────────────────────────────────────────────
    loadUserData().finally(hideSplash);
