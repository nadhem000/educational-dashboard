// ========== All cards merged into one array with a 'category' key ==========
const allCards = [
	// --- Education (8 distinct colors) ---
	{
		id: 'arabic-hub', category: 'education', imageIcon: 'assets/icons/arabicHub.png',
		lightModePalette: { accent: '#0e7c5b', iconBg: '#e6f4ef' },
		darkModePalette: { accent: '#2dd4a8', iconBg: '#1a2e27' },
		link: 'https://arabic-hub.netlify.app', insideLinks: [],
		en: { name: 'Arabic Hub', description: 'Master Arabic language with interactive lessons, grammar, and vocabulary.' },
		fr: { name: 'Arabe Hub', description: 'Maîtrisez la langue arabe avec des leçons interactives, grammaire et vocabulaire.' },
		ar: { name: 'مركز العربية', description: 'أتقن اللغة العربية من خلال دروس تفاعلية وقواعد ومفردات.' }
	},
	{
		id: 'english-hub', category: 'education', imageIcon: 'assets/icons/englishHub.png',
		lightModePalette: { accent: '#2563eb', iconBg: '#eef2ff' },
		darkModePalette: { accent: '#60a5fa', iconBg: '#1a2030' },
		link: 'https://english-hub-education.netlify.app', insideLinks: [],
		en: { name: 'English Hub', description: 'Improve your English skills with exercises, reading, and listening practice.' },
		fr: { name: 'English Hub', description: 'Améliorez votre anglais avec des exercices, lecture et pratique d\'écoute.' },
		ar: { name: 'مركز الإنجليزية', description: 'حسّن مهاراتك في اللغة الإنجليزية من خلال التمارين والقراءة والاستماع.' }
	},
	{
		id: 'mathematics-hub', category: 'education', imageIcon: 'assets/icons/mathematicsHub.png',
		lightModePalette: { accent: '#d45d2b', iconBg: '#fdf0e8' },
		darkModePalette: { accent: '#f08c5c', iconBg: '#2e2218' },
		link: 'https://mathematics-hub-education.netlify.app', insideLinks: [],
		en: { name: 'Mathematics Hub', description: 'Explore math from basics to advanced with interactive problems and visualizations.' },
		fr: { name: 'Mathématiques Hub', description: 'Explorez les mathématiques des bases aux avancées avec des problèmes interactifs et visualisations.' },
		ar: { name: 'مركز الرياضيات', description: 'استكشف الرياضيات من الأساسيات إلى المتقدمة مع مسائل تفاعلية ورسوم توضيحية.' }
	},
	{
		id: 'french-hub', category: 'education', imageIcon: 'assets/icons/frenchHub.png',
		lightModePalette: { accent: '#1e40af', iconBg: '#eef2fb' },
		darkModePalette: { accent: '#6b9fff', iconBg: '#1a2030' },
		link: 'https://french-hub.netlify.app', insideLinks: [],
		en: { name: 'French Hub', description: 'Learn French with interactive lessons, grammar exercises, and vocabulary building.' },
		fr: { name: 'Français Hub', description: 'Apprenez le français avec des leçons interactives, des exercices de grammaire et l\'enrichissement du vocabulaire.' },
		ar: { name: 'مركز الفرنسية', description: 'تعلم اللغة الفرنسية من خلال دروس تفاعلية وتمارين قواعد وبناء المفردات.' }
	},
	{
		id: 'natural-science-hub', category: 'education', imageIcon: 'assets/icons/naturalScienceHub.png',
		lightModePalette: { accent: '#2d8a4e', iconBg: '#eaf5ee' },
		darkModePalette: { accent: '#4dcc78', iconBg: '#182a1f' },
		link: 'https://natural-science-hub.netlify.app', insideLinks: [],
		en: { name: 'Natural Science Hub', description: 'Discover biology, chemistry, and earth sciences with engaging experiments and lessons.' },
		fr: { name: 'Sciences Naturelles Hub', description: 'Découvrez la biologie, la chimie et les sciences de la Terre avec des expériences et leçons captivantes.' },
		ar: { name: 'مركز العلوم الطبيعية', description: 'اكتشف علم الأحياء والكيمياء وعلوم الأرض من خلال تجارب ودروس شيقة.' }
	},
	{
		id: 'physics-hub', category: 'education', imageIcon: 'assets/icons/physicsHub.png',
		lightModePalette: { accent: '#7c3aed', iconBg: '#f3eefb' },
		darkModePalette: { accent: '#a78bfa', iconBg: '#1e1b2e' },
		link: 'https://physics-hub.netlify.app', insideLinks: [],
		en: { name: 'Physics Hub', description: 'Explore physics concepts from mechanics to quantum theory with simulations and problems.' },
		fr: { name: 'Physique Hub', description: 'Explorez les concepts de physique de la mécanique à la théorie quantique avec des simulations et problèmes.' },
		ar: { name: 'مركز الفيزياء', description: 'استكشف مفاهيم الفيزياء من الميكانيكا إلى نظرية الكم مع محاكاة ومسائل.' }
	},
	{
		id: 'philosophy-hub', category: 'education', imageIcon: 'assets/icons/philosophyHub.png',
		lightModePalette: { accent: '#b45309', iconBg: '#fdf4ea' },
		darkModePalette: { accent: '#f59e4b', iconBg: '#2a2016' },
		link: 'https://philosophy-hub.netlify.app', insideLinks: [],
		en: { name: 'Philosophy Hub', description: 'Engage with philosophical ideas, critical thinking, and the great thinkers throughout history.' },
		fr: { name: 'Philosophie Hub', description: 'Explorez les idées philosophiques, la pensée critique et les grands penseurs de l\'histoire.' },
		ar: { name: 'مركز الفلسفة', description: 'تفاعل مع الأفكار الفلسفية والتفكير النقدي وكبار المفكرين عبر التاريخ.' }
	},
	{
		id: 'tests-hub', category: 'education', imageIcon: 'assets/icons/testsHub.png',
		lightModePalette: { accent: '#be123c', iconBg: '#fdf0f1' },
		darkModePalette: { accent: '#fb7185', iconBg: '#2a1c1e' },
		link: 'https://tests-hub.netlify.app', insideLinks: [],
		en: { name: 'Tests Hub', description: 'Practice with quizzes, exams, and assessments across all subjects to track your progress.' },
		fr: { name: 'Tests Hub', description: 'Entraînez-vous avec des quiz, examens et évaluations dans toutes les matières pour suivre vos progrès.' },
		ar: { name: 'مركز الاختبارات', description: 'تدرب على الاختبارات والامتحانات والتقييمات في جميع المواد لتتبع تقدمك.' }
	},
	// --- Others (8 distinct colors) ---
	{
		id: 'wesnoth-tools', category: 'others', imageIcon: 'assets/icons/wesnothTools.png',
		lightModePalette: { accent: '#0d9488', iconBg: '#e6f5f3' },
		darkModePalette: { accent: '#2dd4bf', iconBg: '#14261f' },
		link: 'https://wesnoth-tools-helpers.netlify.app', insideLinks: [],
		en: { name: 'Wesnoth Tools', description: 'A site for diverse tools including image editor, sound editor, ...' },
		fr: { name: 'Outils Wesnoth', description: 'Un site pour divers outils dont éditeur d\'image, éditeur de son, ...' },
		ar: { name: 'أدوات Wesnoth', description: 'موقع لأدوات متنوعة تشمل محرر الصور ومحرر الصوت ...' }
	},
	{
		id: 'wesnoth-editor', category: 'others', imageIcon: 'assets/icons/wesnothEditor.png',
		lightModePalette: { accent: '#b91c1c', iconBg: '#fdf2f2' },
		darkModePalette: { accent: '#f87171', iconBg: '#2a1c1c' },
		link: 'https://wesnoth-file-editor.netlify.app', insideLinks: [],
		en: { name: 'Wesnoth Editor', description: 'A site for a text editor.' },
		fr: { name: 'Éditeur Wesnoth', description: 'Un site pour un éditeur de texte.' },
		ar: { name: 'محرر Wesnoth', description: 'موقع لمحرر نصوص.' }
	},
	{
		id: 'wesnoth-timeline', category: 'others', imageIcon: 'assets/icons/wesnothTimeline.png',
		lightModePalette: { accent: '#a16207', iconBg: '#fef9e7' },
		darkModePalette: { accent: '#fbbf24', iconBg: '#2a2010' },
		link: 'https://wesnoth-archive.netlify.app', insideLinks: [],
		en: { name: 'Wesnoth Timeline', description: 'A site for creating a chronology timeline.' },
		fr: { name: 'Chronologie Wesnoth', description: 'Un site pour créer une chronologie.' },
		ar: { name: 'الخط الزمني Wesnoth', description: 'موقع لإنشاء خط زمني للأحداث.' }
	},
	{
		id: 'multi-tasks-calendar', category: 'others', imageIcon: 'assets/icons/multiTasksCalendar.png',
		lightModePalette: { accent: '#1d4ed8', iconBg: '#eef2ff' },
		darkModePalette: { accent: '#3b82f6', iconBg: '#1a2030' },
		link: 'https://calendar-multi-lang.netlify.app', insideLinks: [],
		en: { name: 'Multi Tasks Calendar', description: 'A site for a special editable calendar.' },
		fr: { name: 'Calendrier Multi-Tâches', description: 'Un site pour un calendrier éditable spécial.' },
		ar: { name: 'تقويم المهام المتعددة', description: 'موقع لتقويم خاص قابل للتعديل.' }
	},
	{
		id: 'code-hub', category: 'others', imageIcon: 'assets/icons/codeHub.png',
		lightModePalette: { accent: '#6d28d9', iconBg: '#f3eefb' },
		darkModePalette: { accent: '#8b5cf6', iconBg: '#1e1b2e' },
		link: 'https://code-learning-hub.netlify.app', insideLinks: [],
		en: { name: 'Code Hub', description: 'A site for teaching coding basics.' },
		fr: { name: 'Code Hub', description: 'Un site pour enseigner les bases de la programmation.' },
		ar: { name: 'مركز البرمجة', description: 'موقع لتعليم أساسيات البرمجة.' }
	},
	{
		id: 'spiritual-guide-hub', category: 'others', imageIcon: 'assets/icons/spiritualGuideHub.png',
		lightModePalette: { accent: '#4f46e5', iconBg: '#f1effa' },
		darkModePalette: { accent: '#818cf8', iconBg: '#1c1b30' },
		link: 'https://atlantis-spiritual-guidance.netlify.app', insideLinks: [],
		en: { name: 'Spiritual Guide Hub', description: 'A site for spirituality.' },
		fr: { name: 'Guide Spirituel Hub', description: 'Un site pour la spiritualité.' },
		ar: { name: 'مركز الدليل الروحي', description: 'موقع للروحانيات.' }
	},
	{
		id: 'spirit-archetype', category: 'others', imageIcon: 'assets/icons/spiritArchetype.png',
		lightModePalette: { accent: '#9333ea', iconBg: '#f4f0f8' },
		darkModePalette: { accent: '#c084fc', iconBg: '#241b30' },
		link: 'https://spirit-archetype.netlify.app', insideLinks: [],
		en: { name: 'Spirit Archetype', description: 'Discover your spiritual pattern through this interactive test.' },
		fr: { name: 'Archétype Spirituel', description: 'Découvrez votre motif spirituel grâce à ce test interactif.' },
		ar: { name: 'النمط الروحي', description: 'اكتشف نمطك الروحي من خلال هذا الاختبار التفاعلي.' }
	},
	{
		id: 'documents-manager', category: 'others', imageIcon: 'assets/icons/documentsManager.png',
		lightModePalette: { accent: '#0891b2', iconBg: '#e6f5f8' },
		darkModePalette: { accent: '#22d3ee', iconBg: '#14262a' },
		link: 'https://documents-manage.netlify.app', insideLinks: [],
		en: { name: 'Documents Manager', description: 'Your all-in-one solution for document editing, validation, and management.' },
		fr: { name: 'Gestionnaire de Documents', description: 'Votre solution tout-en-un pour l\'édition, la validation et la gestion de documents.' },
		ar: { name: 'مدير المستندات', description: 'الحل الشامل لتحرير المستندات والتحقق منها وإدارتها.' }
	},
	// --- Games (2 distinct colors) ---
	{
		id: 'bac-history-geography-quiz', category: 'games', imageIcon: 'assets/icons/bacHistoryGeographyQuiz.png',
		lightModePalette: { accent: '#e67e22', iconBg: '#fef3e7' },
		darkModePalette: { accent: '#f97316', iconBg: '#2e241a' },
		link: 'https://his-geo-quiz-test.netlify.app', insideLinks: [],
		en: { name: 'Bac History Geography Quiz', description: 'Quick memory tests in history and geography for baccalaureate students.' },
		fr: { name: 'Quiz Bac Histoire-Géo', description: 'Tests rapides de mémoire en histoire et géographie pour les élèves du baccalauréat.' },
		ar: { name: 'اختبار الباك تاريخ وجغرافيا', description: 'اختبارات سريعة للذاكرة في التاريخ والجغرافيا لتلاميذ الباكالوريا' }
	},
	{
		id: 'game-hub', category: 'games', imageIcon: 'assets/icons/gameHub.png',
		lightModePalette: { accent: '#10b981', iconBg: '#e6f5ee' },
		darkModePalette: { accent: '#34d399', iconBg: '#14261a' },
		link: 'https://games-collection-hub.netlify.app', insideLinks: [],
		en: { name: 'Game Hub', description: 'Divers games.' },
		fr: { name: 'Game Hub', description: 'Jeux divers.' },
		ar: { name: 'مركز الألعاب', description: 'ألعاب متنوعة.' }
	},
	// --- News (2 distinct colors) ---
	{
		id: 'cosmic-news', category: 'news', imageIcon: 'assets/icons/cosmicNews.png',
		lightModePalette: { accent: '#9b59b6', iconBg: '#f3eef8' },
		darkModePalette: { accent: '#c084fc', iconBg: '#261d30' },
		link: 'https://universe-chronicles.netlify.app', insideLinks: [],
		en: { name: 'Cosmic News', description: 'A site for universe and cosmology news.' },
		fr: { name: 'Actualités Cosmiques', description: 'Un site pour les actualités de l\'univers et de la cosmologie.' },
		ar: { name: 'أخبار الكون', description: 'موقع لأخبار الكون وعلم الكونيات.' }
	},
	{
		id: 'noc-tunisia', category: 'news', imageIcon: 'assets/icons/nocTunisia.png',
		lightModePalette: { accent: '#db2777', iconBg: '#fdf2f7' },
		darkModePalette: { accent: '#f472b6', iconBg: '#2a1c24' },
		link: 'https://noc-tunisian-chapter.netlify.app', insideLinks: [],
		en: { name: 'NOC Tunisia', description: 'Follow NOC Tunisia Chapter of the IAU.' },
		fr: { name: 'NOC Tunisie', description: 'Suivez le chapitre NOC Tunisie de l\'UAI.' },
		ar: { name: 'NOC تونس', description: 'تابع فرع NOC تونس التابع للاتحاد الفلكي الدولي.' }
	},
	// --- Obsolete (11 distinct colors) ---
	{
		id: 'mmathematics-calculators', category: 'obsolete', imageIcon: 'assets/icons/mmathematicsCalculators.png',
		lightModePalette: { accent: '#6b7280', iconBg: '#f3f4f6' },
		darkModePalette: { accent: '#9ca3af', iconBg: '#1f2937' },
		link: 'https://mathematic-hub.netlify.app', insideLinks: [],
		en: { name: 'Mmathematics Calculators', description: 'old version' },
		fr: { name: 'Calculatrices Mathématiques', description: 'ancienne version' },
		ar: { name: 'حاسبات الرياضيات', description: 'إصدار قديم' }
	},
	{
		id: 'calendar-multi-task-old', category: 'obsolete', imageIcon: 'assets/icons/calendarMultiTaskOld.png',
		lightModePalette: { accent: '#78716c', iconBg: '#fafaf9' },
		darkModePalette: { accent: '#a8a29e', iconBg: '#292524' },
		link: 'https://calendar-multi-task.netlify.app', insideLinks: [],
		en: { name: 'Calendar Multi Task', description: 'old version' },
		fr: { name: 'Calendrier Multi-Tâche', description: 'ancienne version' },
		ar: { name: 'تقويم المهام المتعددة', description: 'إصدار قديم' }
	},
	{
		id: 'encyclopedia-of-civilisations', category: 'obsolete', imageIcon: 'assets/icons/encyclopediaOfCivilisations.png',
		lightModePalette: { accent: '#d97706', iconBg: '#fffbeb' },
		darkModePalette: { accent: '#fbbf24', iconBg: '#2a1f12' },
		link: 'https://encyclopedia-of-civilisations.netlify.app', insideLinks: [],
		en: { name: 'Encyclopedia of Civilisations', description: 'Explore ancient and modern civilizations from around the world.' },
		fr: { name: 'Encyclopédie des Civilisations', description: 'Explorez les civilisations anciennes et modernes du monde entier.' },
		ar: { name: 'موسوعة الحضارات', description: 'استكشف الحضارات القديمة والحديثة من جميع أنحاء العالم.' }
	},
	{
		id: 'spiritual-consultation', category: 'obsolete', imageIcon: 'assets/icons/spiritualConsultation.png',
		lightModePalette: { accent: '#9d7b7b', iconBg: '#f9f6f6' },
		darkModePalette: { accent: '#c4a5a5', iconBg: '#231e1e' },
		link: 'https://spiritual-consultation.netlify.app', insideLinks: [],
		en: { name: 'Spiritual Consultation', description: 'old site' },
		fr: { name: 'Consultation Spirituelle', description: 'ancien site' },
		ar: { name: 'استشارة روحية', description: 'موقع قديم' }
	},
	{
		id: 'spiritual-consultation-test', category: 'obsolete', imageIcon: 'assets/icons/spiritualConsultationTest.png',
		lightModePalette: { accent: '#a78b6b', iconBg: '#faf6f0' },
		darkModePalette: { accent: '#d1b896', iconBg: '#2a2318' },
		link: 'https://spiritual-consultationtest.netlify.app', insideLinks: [],
		en: { name: 'Spiritual Consultation Test', description: 'old site' },
		fr: { name: 'Test de Consultation Spirituelle', description: 'ancien site' },
		ar: { name: 'اختبار الاستشارة الروحية', description: 'موقع قديم' }
	},
	{
		id: 'wesnoth-timeline-old', category: 'obsolete', imageIcon: 'assets/icons/wesnothTimelineOld.png',
		lightModePalette: { accent: '#6b8e8a', iconBg: '#f2f7f6' },
		darkModePalette: { accent: '#9dbeb9', iconBg: '#1a2322' },
		link: 'https://wesnoth-timeline.netlify.app', insideLinks: [],
		en: { name: 'Wesnoth Timeline (old)', description: 'old version' },
		fr: { name: 'Chronologie Wesnoth (ancien)', description: 'ancienne version' },
		ar: { name: 'الخط الزمني Wesnoth (قديم)', description: 'إصدار قديم' }
	},
	{
		id: 'interactive-timeline-editor', category: 'obsolete', imageIcon: 'assets/icons/interactiveTimelineEditor.png',
		lightModePalette: { accent: '#b45309', iconBg: '#fdf5e7' },
		darkModePalette: { accent: '#f59e4b', iconBg: '#2a1f12' },
		link: 'https://interactive-timeline-editor.netlify.app', insideLinks: [],
		en: { name: 'Interactive Timeline Editor', description: 'old version' },
		fr: { name: 'Éditeur de Chronologie Interactif', description: 'ancienne version' },
		ar: { name: 'محرر الخط الزمني التفاعلي', description: 'إصدار قديم' }
	},
	{
		id: 'old-quiz-game', category: 'obsolete', imageIcon: 'assets/icons/oldQuizGame.png',
		lightModePalette: { accent: '#cc5500', iconBg: '#fef2eb' },
		darkModePalette: { accent: '#ff7f50', iconBg: '#2b1f12' },
		link: 'https://peppy-babka-081651.netlify.app', insideLinks: [],
		en: { name: 'Old Quiz Game', description: 'old quiz game' },
		fr: { name: 'Ancien Jeu de Quiz', description: 'ancien jeu de quiz' },
		ar: { name: 'لعبة اختبار قديمة', description: 'لعبة اختبار قديمة' }
	},
	{
		id: 'mathematicshub-old', category: 'obsolete', imageIcon: 'assets/icons/mathematicsHubOld.png',
		lightModePalette: { accent: '#4b5563', iconBg: '#f3f4f6' },
		darkModePalette: { accent: '#6b7280', iconBg: '#1f2937' },
		link: 'https://mathematicshub.netlify.app', insideLinks: [],
		en: { name: 'Mathematics Hub (old)', description: 'old version' },
		fr: { name: 'Hub Mathématiques (ancien)', description: 'ancienne version' },
		ar: { name: 'مركز الرياضيات (قديم)', description: 'إصدار قديم' }
	},
	{
		id: 'simple-test-app-old', category: 'obsolete', imageIcon: 'assets/icons/simpleTestAppOld.png',
		lightModePalette: { accent: '#92400e', iconBg: '#fef5e7' },
		darkModePalette: { accent: '#d97706', iconBg: '#2c1f12' },
		link: 'https://simple-test-app-667eea.netlify.app', insideLinks: [],
		en: { name: 'Simple Test App', description: 'old news site' },
		fr: { name: 'Application Test Simple', description: 'ancien site d\'actualités' },
		ar: { name: 'تطبيق اختبار بسيط', description: 'موقع أخبار قديم' }
	},
	{
		id: 'news-test-testing-shares', category: 'obsolete', imageIcon: 'assets/icons/newsTestTestingShares.png',
		lightModePalette: { accent: '#5c6ac4', iconBg: '#f0f1fa' },
		darkModePalette: { accent: '#9ca8e0', iconBg: '#1c1e2e' },
		link: 'https://news-test-testing-shares.netlify.app', insideLinks: [],
		en: { name: 'News Test Site', description: 'old news site' },
		fr: { name: 'Site Test d\'Actualités', description: 'ancien site d\'actualités' },
		ar: { name: 'موقع اختبار الأخبار', description: 'موقع أخبار قديم' }
	}
];

// ========== Category → grid mapping ==========
const categoryConfig = {
	education: { gridId: 'cardGrid', cssClass: 'ED-General-card--education' },
	others: { gridId: 'othersGrid', cssClass: 'ED-General-card--others' },
	games: { gridId: 'gamesGrid', cssClass: 'ED-General-card--games' },
	news: { gridId: 'newsGrid', cssClass: 'ED-General-card--news' },
	obsolete: { gridId: 'obsoleteGrid', cssClass: 'ED-General-card--obsolete' }
};
       // ================== SOCIAL MEDIA DATA ==================
const socialMedias = [
  {
    mediaLink: 'https://linkedin.com/in/mejriziad',
    mediaSmallIcon: '🔗',
    mediaImage: 'assets/contact/linkedin.png',
    en: { mediaName: 'LinkedIn' },
    fr: { mediaName: 'LinkedIn' },
    ar: { mediaName: 'لينكد إن' }
  },
  {
    mediaLink: 'https://github.com/mejriziad',
    mediaSmallIcon: '🐙',
    mediaImage: 'assets/contact/github.png',
    en: { mediaName: 'GitHub' },
    fr: { mediaName: 'GitHub' },
    ar: { mediaName: 'غيت هاب' }
  },
  {
    mediaLink: 'https://twitter.com/mejriziad',
    mediaSmallIcon: '𝕏',
    mediaImage: 'assets/contact/x-twitter.png',
    en: { mediaName: 'X (Twitter)' },
    fr: { mediaName: 'X (Twitter)' },
    ar: { mediaName: 'إكس (تويتر)' }
  },
  {
    mediaLink: 'https://facebook.com/mejriziad',
    mediaSmallIcon: '📘',
    mediaImage: 'assets/contact/facebook.png',
    en: { mediaName: 'Facebook' },
    fr: { mediaName: 'Facebook' },
    ar: { mediaName: 'فيسبوك' }
  },
  {
    mediaLink: 'https://youtube.com/@mejriziad',
    mediaSmallIcon: '▶️',
    mediaImage: 'assets/contact/youtube.png',
    en: { mediaName: 'YouTube' },
    fr: { mediaName: 'YouTube' },
    ar: { mediaName: 'يوتيوب' }
  },
  {
    mediaLink: 'https://instagram.com/mejriziad',
    mediaSmallIcon: '📷',
    mediaImage: 'assets/contact/instagram.png',
    en: { mediaName: 'Instagram' },
    fr: { mediaName: 'Instagram' },
    ar: { mediaName: 'انستغرام' }
  },
  {
    mediaLink: 'https://tiktok.com/@mejriziad',
    mediaSmallIcon: '🎵',
    mediaImage: 'assets/contact/tiktok.png',
    en: { mediaName: 'TikTok' },
    fr: { mediaName: 'TikTok' },
    ar: { mediaName: 'تيك توك' }
  },
  {
    mediaLink: 'https://medium.com/@mejriziad',
    mediaSmallIcon: '📝',
    mediaImage: 'assets/contact/medium.png',
    en: { mediaName: 'Medium' },
    fr: { mediaName: 'Medium' },
    ar: { mediaName: 'ميديوم' }
  },
  {
    mediaLink: 'https://wa.me/21612345678',
    mediaSmallIcon: '💬',
    mediaImage: 'assets/contact/whatsapp.png',
    en: { mediaName: 'WhatsApp' },
    fr: { mediaName: 'WhatsApp' },
    ar: { mediaName: 'واتساب' }
  },
  {
    mediaLink: 'https://t.me/mejriziad',
    mediaSmallIcon: '✈️',
    mediaImage: 'assets/contact/telegram.png',
    en: { mediaName: 'Telegram' },
    fr: { mediaName: 'Telegram' },
    ar: { mediaName: 'تيليغرام' }
  },
  {
    mediaLink: 'https://discord.gg/mejriziad',
    mediaSmallIcon: '🎮',
    mediaImage: 'assets/contact/discord.png',
    en: { mediaName: 'Discord' },
    fr: { mediaName: 'Discord' },
    ar: { mediaName: 'ديسكورد' }
  },
  {
    mediaLink: 'https://stackoverflow.com/users/mejriziad',
    mediaSmallIcon: '📚',
    mediaImage: 'assets/contact/stackoverflow.png',
    en: { mediaName: 'Stack Overflow' },
    fr: { mediaName: 'Stack Overflow' },
    ar: { mediaName: 'ستاك أوفرفلو' }
  }
];