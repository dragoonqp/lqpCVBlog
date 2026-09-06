const zh = {
  'Senior Front-End Engineer · Full-Stack Delivery':
    '高级前端工程师 · 全栈交付',
  Profile: '个人优势',
  'Technical Skills': '专业技能',
  Highlights: '主要成果',
  'Work Experience': '工作经历',
  'Engineering Notes': '工程笔记',
  'Front-End Development': '前端开发',
  'Full-Stack Development': '全栈开发',
  'Data Visualization': '数据可视化',
  'Engineering & Delivery': '工程与交付',
  'Click me': '查看掌握程度',
  '2024 performance rank': '2024 年绩效排名',
  'Critical defects': '严重缺陷',
  'HSBC platforms maintained full-stack': '全栈维护的汇丰平台',
  Languages: '语言能力',
  'English · CEFR C1': '英语 · CEFR C1',
  'Technology depth map': '技术掌握程度',
  'TECHNOLOGY DEPTH MAP': '技术掌握程度',
  All: '全部',
  Frontend: '前端',
  'Full-stack': '全栈',
  Visual: '可视化',
  Engineering: '工程交付',
  Mastery: '掌握程度',
  Experience: '使用年限',
  'CORE ZONE': '核心能力区',
  '← growing capability': '← 能力成长',
  'mastery →': '掌握程度 →',
  Manage: '数据管理',
  'Let’s talk': '联系我',
  years: '年',
  impact: '影响范围',
  'Mastery × years of experience; bubble size represents project impact.':
    '掌握程度 × 使用年限；气泡大小代表项目影响范围。',
  'No mastery and experience data yet. Add these values in Admin.':
    '该分组尚未设置掌握程度和使用年限，可在管理页面补充。',
  '7+ years delivering enterprise products across financial services, manufacturing, telecom and government platforms.':
    '拥有 7 年以上企业产品交付经验，涵盖金融服务、制造业、电信和政务平台。',
  'Front-end architecture with JavaScript, TypeScript, Vue and React, supported by reusable components and resilient engineering.':
    '熟悉 JavaScript、TypeScript、Vue 和 React 前端架构，注重可复用组件与工程可靠性。',
  'Full-stack delivery spanning Java Spring, SQL Server and automated UAT deployments.':
    '具备 Java Spring、SQL Server 及 UAT 自动化部署的全栈交付能力。',
  'Expressive data visualization with ECharts and Three.js, bridging complex data and clear product experiences.':
    '使用 ECharts 和 Three.js 构建数据可视化，将复杂数据转化为清晰的产品体验。',
  'Specialist Engineer · P8': '专家工程师 · P8',
  'Senior Front-End Engineer': '高级前端工程师',
  'Front-End Engineer': '前端工程师',
  'Full-stack delivery for HSBC service management systems, spanning Vue 3, React, Java Spring, SQL Server and automated UAT deployments.':
    '负责汇丰服务管理系统的全栈交付，涉及 Vue 3、React、Java Spring、SQL Server 和 UAT 自动化部署。',
  'Architected Midea’s quality and manufacturing data platform from zero, including responsive workflows, geographic analytics and Three.js scenes.':
    '从零搭建美的质量与制造数据平台，涵盖响应式业务流程、地理数据分析和 Three.js 场景。',
  'Built HSBC hybrid applications for innovation proposals and workspace booking, including granular permissions and gesture-rich floor maps.':
    '开发汇丰创新提案和工位预约混合应用，实现精细化权限管理与支持手势交互的楼层地图。',
  'Delivered reusable enterprise order-management modules and high-level editable table and validation components for Guangzhou Unicom.':
    '为广州联通交付可复用的企业订单管理模块，以及可编辑表格和校验组件。',
  '0 critical defects': '0 严重缺陷',
  Architecture: '架构',
  Visualization: '可视化',
  'Making organizational data feel simple': '让组织数据更易理解',
  'A field guide to component boundaries and calculation utilities for deeply nested enterprise hierarchies.':
    '针对多层级企业组织结构，梳理组件边界和计算工具的设计方法。',
  'From dashboard to spatial story': '从数据看板到空间叙事',
  'What changed when a Three.js globe became a real navigation surface instead of decoration.':
    '探讨将 Three.js 地球从装饰元素转化为实际导航界面带来的变化。',
  'Reliable releases are a product feature': '可靠发布也是产品能力',
  'Practical notes on UAT automation, production incident rotation and keeping delivery calm.':
    '关于 UAT 自动化、生产事件轮值与稳定交付的实践笔记。',
};
function translate(text, locale, override) {
  if (locale !== 'zh') return text;
  return (typeof override === 'string' && override.trim()) || zh[text] || text;
}
module.exports = { translate, zh };
