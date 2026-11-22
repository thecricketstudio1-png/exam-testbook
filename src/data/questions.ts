import {Question} from '../types/exam';

/**
 * 5 Bilingual Sample Questions clearly tagged as Sample Dev Data.
 * Covers MCQ (single choice), MSQ (multi-select), and NAT (numeric keypad)
 * so all CBT engine question modes are deterministically testable.
 */
const BASE_SAMPLE_DEV_QUESTIONS: Question[] = [
  {
    id: 'sample-q1',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'MCQ',
    marks: 2,
    negativeMark: 0.5,
    isSampleDevData: true,
    question: {
      en: 'A train 240 meters long passes a pole in 24 seconds. How long will it take to pass a platform 650 meters long at the same speed?',
      hi: '240 मीटर लंबी एक ट्रेन एक खंभे को 24 सेकंड में पार करती है। उसी गति से 650 मीटर लंबे प्लेटफॉर्म को पार करने में उसे कितना समय लगेगा?',
    },
    options: [
      {id: 'a', text: {en: '65 seconds', hi: '65 सेकंड'}},
      {id: 'b', text: {en: '89 seconds', hi: '89 सेकंड'}},
      {id: 'c', text: {en: '90 seconds', hi: '90 सेकंड'}},
      {id: 'd', text: {en: '100 seconds', hi: '100 सेकंड'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Speed of train = 240 / 24 = 10 m/s. Total distance to pass the platform = 240 + 650 = 890 m. Time = 890 / 10 = 89 seconds.',
      hi: 'ट्रेन की गति = 240 / 24 = 10 मीटर/सेकंड। प्लेटफॉर्म पार करने में कुल दूरी = 240 + 650 = 890 मीटर। समय = 890 / 10 = 89 सेकंड।',
    },
  },
  {
    id: 'sample-q2',
    section: {en: 'General Awareness', hi: 'सामान्य जागरूकता'},
    type: 'MCQ',
    marks: 2,
    negativeMark: 0.5,
    isSampleDevData: true,
    question: {
      en: 'Which Article of the Constitution of India empowers the Election Commission of India to superintend, direct, and control elections?',
      hi: 'भारतीय संविधान का कौन सा अनुच्छेद भारत के निर्वाचन आयोग को चुनावों के अधीक्षण, निर्देशन और नियंत्रण का अधिकार देता है?',
    },
    options: [
      {id: 'a', text: {en: 'Article 280', hi: 'अनुच्छेद 280'}},
      {id: 'b', text: {en: 'Article 315', hi: 'अनुच्छेद 315'}},
      {id: 'c', text: {en: 'Article 324', hi: 'अनुच्छेद 324'}},
      {id: 'd', text: {en: 'Article 352', hi: 'अनुच्छेद 352'}},
    ],
    correctAnswer: 'c',
    explanation: {
      en: 'Article 324 vests the superintendence, direction, and control of elections in the Election Commission of India. Article 280 is Finance Commission and Article 315 is UPSC/State PSC.',
      hi: 'अनुच्छेद 324 चुनावों के अधीक्षण, निर्देशन और नियंत्रण की शक्ति भारत निर्वाचन आयोग को प्रदान करता है। अनुच्छेद 280 वित्त आयोग और 315 लोक सेवा आयोग से संबंधित है।',
    },
  },
  {
    id: 'sample-q3',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MSQ',
    marks: 2,
    negativeMark: 0.33,
    isSampleDevData: true,
    question: {
      en: 'Which of the following statements are CORRECT regarding Fundamental Rights in the Indian Constitution? (Select all that apply)',
      hi: 'भारतीय संविधान में मौलिक अधिकारों के संबंध में निम्नलिखित में से कौन से कथन सही हैं? (सभी सही विकल्प चुनें)',
    },
    options: [
      {
        id: 'a',
        text: {
          en: 'Right to Constitutional Remedies is guaranteed under Article 32.',
          hi: 'संवैधानिक उपचारों का अधिकार अनुच्छेद 32 के अंतर्गत गारंटीकृत है।',
        },
      },
      {
        id: 'b',
        text: {
          en: 'Right to Property is currently a Fundamental Right under Part III.',
          hi: 'संपत्ति का अधिकार वर्तमान में भाग III के तहत एक मौलिक अधिकार है।',
        },
      },
      {
        id: 'c',
        text: {
          en: 'Articles 20 and 21 cannot be suspended even during a National Emergency.',
          hi: 'अनुच्छेद 20 और 21 को राष्ट्रीय आपातकाल के दौरान भी निलंबित नहीं किया जा सकता।',
        },
      },
      {
        id: 'd',
        text: {
          en: 'Fundamental Rights are completely non-justiciable in court.',
          hi: 'मौलिक अधिकार न्यायालय में पूरी तरह गैर-न्यायोचित हैं।',
        },
      },
    ],
    correctAnswer: ['a', 'c'],
    explanation: {
      en: 'Article 32 guarantees Constitutional Remedies (A is correct). Right to Property was moved to Article 300A as a legal right by the 44th Amendment (B is false). Articles 20 & 21 remain enforceable during emergency (C is correct). Fundamental Rights are justiciable (D is false).',
      hi: 'अनुच्छेद 32 संवैधानिक उपचारों का अधिकार देता है (A सही)। 44वें संशोधन द्वारा संपत्ति के अधिकार को अनुच्छेद 300A में कानूनी अधिकार बनाया गया (B गलत)। आपातकाल में अनुच्छेद 20 और 21 निलंबित नहीं होते (C सही)। मौलिक अधिकार न्यायोचित हैं (D गलत)।',
    },
  },
  {
    id: 'sample-q4',
    section: {en: 'General Intelligence & Reasoning', hi: 'तर्कशक्ति एवं बुद्धिमत्ता'},
    type: 'NAT',
    marks: 2,
    negativeMark: 0,
    isSampleDevData: true,
    question: {
      en: 'Find the missing number in the series: 7, 15, 31, 63, 127, ? (Enter exact integer using the keypad)',
      hi: 'श्रृंखला में लुप्त संख्या ज्ञात कीजिए: 7, 15, 31, 63, 127, ? (कीपैड का उपयोग करके सटीक पूर्णांक दर्ज करें)',
    },
    correctAnswer: '255',
    explanation: {
      en: 'Pattern: Each term = (Previous term × 2) + 1. Thus 7×2+1=15, 15×2+1=31, 31×2+1=63, 63×2+1=127, and 127×2+1 = 255.',
      hi: 'पैटर्न: प्रत्येक पद = (पिछला पद × 2) + 1। अतः 127 × 2 + 1 = 255।',
    },
  },
  {
    id: 'sample-q5',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'NAT',
    marks: 2,
    negativeMark: 0.25,
    isSampleDevData: true,
    question: {
      en: 'If the compound interest on ₹10,000 at 10% per annum for 2 years compounded annually is CI, enter the exact value of CI in Rupees.',
      hi: 'यदि ₹10,000 पर 10% वार्षिक दर से 2 वर्षों का वार्षिक चक्रवृद्धि ब्याज CI है, तो रुपये में CI का सटीक मान दर्ज करें।',
    },
    correctAnswer: '2100',
    explanation: {
      en: 'Amount = 10000 × (1 + 10/100)² = 10000 × 1.21 = ₹12,100. Compound Interest = 12,100 - 10,000 = ₹2,100.',
      hi: 'मिश्रधन = 10000 × (1 + 10/100)² = ₹12,100। चक्रवृद्धि ब्याज = 12,100 - 10,000 = ₹2,100।',
    },
  },
];

interface RawBilingualMcqSample {
  id: string;
  examId: 'rrb-ntpc' | 'jssc-cgl';
  section: {en: string; hi: string};
  type: 'MCQ';
  questionEn: string;
  questionHi: string;
  optionsEn: [string, string, string, string];
  optionsHi: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanationEn: string;
  explanationHi: string;
  sourceTag: 'Sample Dev Data';
}

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;

export const RRB_NTPC_JSSC_CGL_RAW_QUESTIONS: RawBilingualMcqSample[] = [
  // RRB NTPC (5 Bilingual MCQs)
  {
    id: 'rrb-ntpc-q1',
    examId: 'rrb-ntpc',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'MCQ',
    questionEn:
      'If 15 workers can build a wall in 48 hours, how many workers will be required to complete the same work in 30 hours?',
    questionHi:
      'यदि 15 मजदूर एक दीवार को 48 घंटे में बना सकते हैं, तो उसी काम को 30 घंटे में पूरा करने के लिए कितने मजदूरों की आवश्यकता होगी?',
    optionsEn: ['20 workers', '24 workers', '25 workers', '28 workers'],
    optionsHi: ['20 मजदूर', '24 मजदूर', '25 मजदूर', '28 मजदूर'],
    correctIndex: 1,
    explanationEn:
      'Total work = 15 × 48 = 720 worker-hours. Workers required for 30 hours = 720 / 30 = 24 workers.',
    explanationHi:
      'कुल कार्य = 15 × 48 = 720 मजदूर-घंटे। 30 घंटे के लिए आवश्यक मजदूर = 720 / 30 = 24 मजदूर।',
    sourceTag: 'Sample Dev Data',
  },
  {
    id: 'rrb-ntpc-q2',
    examId: 'rrb-ntpc',
    section: {en: 'General Awareness', hi: 'सामान्य जागरूकता'},
    type: 'MCQ',
    questionEn: 'In which year was the Railway Board of India formally established?',
    questionHi: 'भारत के रेलवे बोर्ड की औपचारिक स्थापना किस वर्ष हुई थी?',
    optionsEn: ['1853', '1881', '1905', '1947'],
    optionsHi: ['1853', '1881', '1905', '1947'],
    correctIndex: 2,
    explanationEn:
      'The Railway Board of India was formally constituted in March 1905 during the viceroyalty of Lord Curzon.',
    explanationHi:
      'भारत के रेलवे बोर्ड का औपचारिक गठन मार्च 1905 में लॉर्ड कर्जन के कार्यकाल के दौरान किया गया था।',
    sourceTag: 'Sample Dev Data',
  },
  {
    id: 'rrb-ntpc-q3',
    examId: 'rrb-ntpc',
    section: {en: 'General Intelligence & Reasoning', hi: 'तर्कशक्ति एवं बुद्धिमत्ता'},
    type: 'MCQ',
    questionEn: 'Find the odd pair out among the following number pairs:',
    questionHi: 'निम्नलिखित संख्या युग्मों में से असंगत युग्म चुनिए:',
    optionsEn: ['4 : 64', '5 : 125', '6 : 216', '7 : 342'],
    optionsHi: ['4 : 64', '5 : 125', '6 : 216', '7 : 342'],
    correctIndex: 3,
    explanationEn:
      'Each pair follows the pattern n : n³. Since 4³ = 64, 5³ = 125, 6³ = 216, while 7³ = 343 (not 342), 7 : 342 is the odd pair out.',
    explanationHi:
      'प्रत्येक युग्म n : n³ के पैटर्न का पालन करता है। 4³ = 64, 5³ = 125, 6³ = 216, जबकि 7³ = 343 होता है (342 नहीं), अतः 7 : 342 असंगत है।',
    sourceTag: 'Sample Dev Data',
  },
  {
    id: 'rrb-ntpc-q4',
    examId: 'rrb-ntpc',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    questionEn: 'What is the SI unit of electrical resistance?',
    questionHi: 'विद्युत प्रतिरोध (Electrical Resistance) की SI इकाई क्या है?',
    optionsEn: ['Ohm', 'Ampere', 'Volt', 'Watt'],
    optionsHi: ['ओम (Ohm)', 'एम्पियर (Ampere)', 'वोल्ट (Volt)', 'वाट (Watt)'],
    correctIndex: 0,
    explanationEn:
      'Electrical resistance is measured in Ohms (Ω). Ampere is for current, Volt for potential difference, and Watt for power.',
    explanationHi:
      'विद्युत प्रतिरोध को ओम (Ω) में मापा जाता है। एम्पियर विद्युत धारा की, वोल्ट विभवांतर की और वाट शक्ति की इकाई है।',
    sourceTag: 'Sample Dev Data',
  },
  {
    id: 'rrb-ntpc-q5',
    examId: 'rrb-ntpc',
    section: {en: 'General Awareness', hi: 'सामान्य जागरूकता'},
    type: 'MCQ',
    questionEn:
      'Which railway station in India holds the Guinness World Record for the longest railway platform in the world?',
    questionHi:
      'भारत के किस रेलवे स्टेशन के नाम विश्व के सबसे लंबे रेलवे प्लेटफॉर्म का गिनीज वर्ल्ड रिकॉर्ड दर्ज है?',
    optionsEn: [
      'Gorakhpur Junction, Uttar Pradesh',
      'Hubballi Junction, Karnataka',
      'Kharagpur Junction, West Bengal',
      'Kollam Junction, Kerala',
    ],
    optionsHi: [
      'गोरखपुर जंक्शन, उत्तर प्रदेश',
      'हुबली जंक्शन, कर्नाटक',
      'खड़गपुर जंक्शन, पश्चिम बंगाल',
      'कोल्लम जंक्शन, केरल',
    ],
    correctIndex: 1,
    explanationEn:
      'Shree Siddharoodha Swamiji Hubballi Junction (Karnataka) has a 1,507-meter-long platform, recognized by Guinness World Records as the longest in the world.',
    explanationHi:
      'श्री सिद्धारूढ़ स्वामीजी हुबली जंक्शन (कर्नाटक) का प्लेटफॉर्म 1,507 मीटर लंबा है, जिसे गिनीज वर्ल्ड रिकॉर्ड्स द्वारा विश्व का सबसे लंबा प्लेटफॉर्म माना गया है।',
    sourceTag: 'Sample Dev Data',
  },

  // JSSC CGL (5 Bilingual MCQs)
  {
    id: 'jssc-cgl-q1',
    examId: 'jssc-cgl',
    section: {en: 'Jharkhand General Knowledge', hi: 'झारखंड सामान्य ज्ञान'},
    type: 'MCQ',
    questionEn: 'Who were the primary leaders of the historic Santhal Hul (Rebellion) of 1855–56 in Jharkhand?',
    questionHi: 'झारखंड में 1855–56 के ऐतिहासिक संथाल हूल (विद्रोह) के प्रमुख नेता कौन थे?',
    optionsEn: [
      'Sidhu and Kanhu Murmu',
      'Tilka Manjhi and Ganga Narayan',
      'Jatra Bhagat and Budhu Bhagat',
      'Nilamber and Pitamber',
    ],
    optionsHi: [
      'सिद्धू और कान्हू मुर्मू',
      'तिलका मांझी और गंगा नारायण',
      'जतरा भगत और बुधु भगत',
      'नीलांबर और पीतांबर',
    ],
    correctIndex: 0,
    explanationEn:
      'Sidhu and Kanhu Murmu (along with brothers Chand and Bhairav) led the Santhal Hul of 1855–56 against British colonial exploitation and zamindars.',
    explanationHi:
      'सिद्धू और कान्हू मुर्मू (अपने भाइयों चांद और भैरव के साथ) ने ब्रिटिश औपनिवेशिक शोषण और जमींदारों के विरुद्ध 1855–56 के संथाल हूल का नेतृत्व किया।',
    sourceTag: 'Sample Dev Data',
  },
  {
    id: 'jssc-cgl-q2',
    examId: 'jssc-cgl',
    section: {en: 'Jharkhand General Knowledge', hi: 'झारखंड सामान्य ज्ञान'},
    type: 'MCQ',
    questionEn: 'Hundru Falls, one of the highest waterfalls in Jharkhand, is formed on which river?',
    questionHi: 'झारखंड के सबसे ऊँचे जलप्रपातों में से एक हुंडरू जलप्रपात किस नदी पर स्थित है?',
    optionsEn: ['Damodar River', 'Barakar River', 'Subarnarekha River', 'North Koel River'],
    optionsHi: ['दामोदर नदी', 'बराकर नदी', 'स्वर्णरेखा नदी', 'उत्तरी कोयल नदी'],
    correctIndex: 2,
    explanationEn:
      'Hundru Falls is located near Ranchi on the course of the Subarnarekha River, dropping from a height of about 98 meters.',
    explanationHi:
      'हुंडरू जलप्रपात रांची के पास स्वर्णरेखा नदी पर स्थित है, जो लगभग 98 मीटर की ऊँचाई से गिरता है।',
    sourceTag: 'Sample Dev Data',
  },
  {
    id: 'jssc-cgl-q3',
    examId: 'jssc-cgl',
    section: {en: 'Jharkhand General Knowledge', hi: 'झारखंड सामान्य ज्ञान'},
    type: 'MCQ',
    questionEn: 'On which date was Jharkhand formed as the 28th state of India?',
    questionHi: 'भारत के 28वें राज्य के रूप में झारखंड का गठन किस तिथि को हुआ था?',
    optionsEn: [
      '1 November 2000',
      '15 November 2000',
      '9 November 2000',
      '26 January 2001',
    ],
    optionsHi: [
      '1 नवंबर 2000',
      '15 नवंबर 2000',
      '9 नवंबर 2000',
      '26 जनवरी 2001',
    ],
    correctIndex: 1,
    explanationEn:
      'Jharkhand was carved out of southern Bihar on 15 November 2000, coinciding with the birth anniversary of Birsa Munda.',
    explanationHi:
      'भगवान बिरसा मुंडा की जयंती के अवसर पर 15 नवंबर 2000 को बिहार से अलग करके झारखंड राज्य का गठन किया गया था।',
    sourceTag: 'Sample Dev Data',
  },
  {
    id: 'jssc-cgl-q4',
    examId: 'jssc-cgl',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    questionEn: 'Which gas is the primary contributor to the enhanced greenhouse effect and global warming?',
    questionHi: 'बढ़ते ग्रीनहाउस प्रभाव और ग्लोबल वार्मिंग के लिए मुख्य रूप से कौन सी गैस उत्तरदायी है?',
    optionsEn: ['Nitrogen (N₂)', 'Carbon Dioxide (CO₂)', 'Argon (Ar)', 'Hydrogen (H₂)'],
    optionsHi: [
      'नाइट्रोजन (N₂)',
      'कार्बन डाइऑक्साइड (CO₂)',
      'आर्गन (Ar)',
      'हाइड्रोजन (H₂)',
    ],
    correctIndex: 1,
    explanationEn:
      'Carbon Dioxide (CO₂) is the primary anthropogenic greenhouse gas trapping outgoing infrared radiation in Earth’s atmosphere.',
    explanationHi:
      'कार्बन डाइऑक्साइड (CO₂) पृथ्वी के वायुमंडल में ऊष्मा को रोकने वाली प्रमुख मानवजनित ग्रीनहाउस गैस है।',
    sourceTag: 'Sample Dev Data',
  },
  {
    id: 'jssc-cgl-q5',
    examId: 'jssc-cgl',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'MCQ',
    questionEn: 'The average of 5 consecutive odd numbers is 27. What is the largest of these numbers?',
    questionHi: '5 क्रमागत विषम संख्याओं का औसत 27 है। इनमें से सबसे बड़ी संख्या क्या है?',
    optionsEn: ['25', '29', '30', '31'],
    optionsHi: ['25', '29', '30', '31'],
    correctIndex: 3,
    explanationEn:
      'For 5 consecutive odd numbers, the middle (3rd) number equals the average = 27. The numbers are 23, 25, 27, 29, and 31. Thus the largest number is 31.',
    explanationHi:
      '5 क्रमागत विषम संख्याओं में बीच की (तीसरी) संख्या औसत (27) के बराबर होती है। संख्याएँ 23, 25, 27, 29, 31 हैं। अतः सबसे बड़ी संख्या 31 है।',
    sourceTag: 'Sample Dev Data',
  },
];

export const RRB_NTPC_JSSC_CGL_QUESTIONS: Question[] = RRB_NTPC_JSSC_CGL_RAW_QUESTIONS.map(
  (raw) => ({
    id: raw.id,
    section: raw.section,
    type: raw.type,
    marks: 2,
    negativeMark: 0.33,
    isSampleDevData: raw.sourceTag === 'Sample Dev Data',
    tags: [raw.examId, raw.sourceTag],
    question: {
      en: raw.questionEn,
      hi: raw.questionHi,
    },
    options: raw.optionsEn.map((optEn, idx) => ({
      id: OPTION_IDS[idx],
      text: {
        en: optEn,
        hi: raw.optionsHi[idx],
      },
    })),
    correctAnswer: OPTION_IDS[raw.correctIndex],
    explanation: {
      en: raw.explanationEn,
      hi: raw.explanationHi,
    },
  }),
);

export const RAILWAY_2026_27_QUESTIONS: Question[] = [
  {
    id: 'rrb-2026-q1',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'RRB JE', 'Physics Numerical', 'NCERT Class 10'],
    question: {
      en: 'An object is placed at a distance of 30 cm in front of a concave mirror of focal length 20 cm. What is the position and nature of the image formed?',
      hi: '20 सेमी फोकस दूरी वाले अवतल दर्पण के सामने 30 सेमी की दूरी पर एक वस्तु रखी गई है। बनने वाले प्रतिबिंब की स्थिति और प्रकृति क्या होगी?',
    },
    options: [
      {id: 'a', text: {en: '60 cm behind the mirror, virtual and erect', hi: 'दर्पण के पीछे 60 सेमी, आभासी एवं सीधा'}},
      {id: 'b', text: {en: '60 cm in front of the mirror, real and inverted', hi: 'दर्पण के सामने 60 सेमी, वास्तविक एवं उल्टा'}},
      {id: 'c', text: {en: '12 cm in front of the mirror, real and inverted', hi: 'दर्पण के सामने 12 सेमी, वास्तविक एवं उल्टा'}},
      {id: 'd', text: {en: '30 cm in front of the mirror, virtual and inverted', hi: 'दर्पण के सामने 30 सेमी, आभासी एवं उल्टा'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Using mirror formula 1/f = 1/v + 1/u with sign convention (u = −30 cm, f = −20 cm): 1/v = 1/(−20) − 1/(−30) = −1/20 + 1/30 = −1/60 ⇒ v = −60 cm. Negative sign indicates the image is 60 cm in front of the mirror, real and inverted (magnification m = −v/u = −2).',
      hi: 'दर्पण सूत्र 1/f = 1/v + 1/u और चिह्न परिपाटी (u = −30 सेमी, f = −20 सेमी) से: 1/v = −1/20 + 1/30 = −1/60 ⇒ v = −60 सेमी। ऋणात्मक चिह्न दर्शाता है कि प्रतिबिंब दर्पण के सामने 60 सेमी की दूरी पर, वास्तविक एवं उल्टा (आवर्धन m = −2) बनेगा।',
    },
  },
  {
    id: 'rrb-2026-q2',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'RRB JE', 'Physics Numerical', 'NCERT Class 10'],
    question: {
      en: 'Two resistors of 6 Ω and 12 Ω are connected in parallel across a 12 V battery. Calculate the total electrical power dissipated in the circuit.',
      hi: '6 Ω और 12 Ω के दो प्रतिरोधक 12 V की बैटरी के समानांतर क्रम (Parallel) में जुड़े हैं। परिपथ में व्यय होने वाली कुल विद्युत शक्ति की गणना करें।',
    },
    options: [
      {id: 'a', text: {en: '18 W', hi: '18 W'}},
      {id: 'b', text: {en: '24 W', hi: '24 W'}},
      {id: 'c', text: {en: '36 W', hi: '36 W'}},
      {id: 'd', text: {en: '48 W', hi: '48 W'}},
    ],
    correctAnswer: 'c',
    explanation: {
      en: 'Equivalent resistance in parallel: 1/Req = 1/6 + 1/12 = 3/12 = 1/4 ⇒ Req = 4 Ω. Total power P = V² / Req = 12² / 4 = 144 / 4 = 36 W.',
      hi: 'समानांतर क्रम में तुल्य प्रतिरोध: 1/Req = 1/6 + 1/12 = 3/12 = 1/4 ⇒ Req = 4 Ω। कुल शक्ति P = V² / Req = 144 / 4 = 36 W।',
    },
  },
  {
    id: 'rrb-2026-q3',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'Statement-Based', 'Chemistry', 'NCERT Class 10'],
    question: {
      en: 'Consider the following statements regarding NCERT chemical reactions:\nStatement I: Thermal decomposition of Ferrous Sulphate (FeSO₄) produces Ferric Oxide (Fe₂O₃), SO₂, and SO₃ gases.\nStatement II: In the Chlor-alkali process (electrolysis of aqueous NaCl), Chlorine gas (Cl₂) is liberated at the cathode and Hydrogen gas (H₂) at the anode.\nWhich of the statements given above is/are correct?',
      hi: 'NCERT रासायनिक अभिक्रियाओं के संदर्भ में निम्नलिखित कथनों पर विचार करें:\nकथन I: फेरस सल्फेट (FeSO₄) के ऊष्मीय अपघटन से फेरिक ऑक्साइड (Fe₂O₃), SO₂ और SO₃ गैसें प्राप्त होती हैं।\nकथन II: क्लोर-क्षार प्रक्रिया (जलीय NaCl का विद्युत अपघटन) में क्लोरीन गैस (Cl₂) कैथोड पर तथा हाइड्रोजन गैस (H₂) एनोड पर मुक्त होती है।\nउपर्युक्त में से कौन-सा/से कथन सही है/हैं?',
    },
    options: [
      {id: 'a', text: {en: 'Only Statement I is correct', hi: 'केवल कथन I सही है'}},
      {id: 'b', text: {en: 'Only Statement II is correct', hi: 'केवल कथन II सही है'}},
      {id: 'c', text: {en: 'Both Statement I and Statement II are correct', hi: 'कथन I और कथन II दोनों सही हैं'}},
      {id: 'd', text: {en: 'Neither Statement I nor Statement II is correct', hi: 'न तो कथन I और न ही कथन II सही है'}},
    ],
    correctAnswer: 'a',
    explanation: {
      en: 'Statement I is true: 2FeSO₄(s) → Fe₂O₃(s) + SO₂(g) + SO₃(g). Statement II is false because in the Chlor-alkali process, Chlorine (Cl₂) is liberated at the ANODE (+) and Hydrogen (H₂) is liberated at the CATHODE (−).',
      hi: 'कथन I सही है: 2FeSO₄(s) → Fe₂O₃(s) + SO₂(g) + SO₃(g)। कथन II गलत है क्योंकि क्लोर-क्षार प्रक्रिया में क्लोरीन (Cl₂) एनोड (+) पर और हाइड्रोजन (H₂) कैथोड (−) पर मुक्त होती है।',
    },
  },
  {
    id: 'rrb-2026-q4',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'Assertion-Reason', 'Chemistry', 'NCERT Class 10'],
    question: {
      en: 'Assertion (A): Plaster of Paris (CaSO₄·½H₂O) should always be stored in a moisture-proof container.\nReason (R): On coming in contact with moisture, Plaster of Paris reacts with water to form a hard solid mass called Gypsum (CaSO₄·2H₂O).\nChoose the correct option:',
      hi: 'अभिकथन (A): प्लास्टर ऑफ पेरिस (CaSO₄·½H₂O) को सदैव आर्द्रता-रोधी (moisture-proof) बर्तन में रखा जाना चाहिए।\nकारण (R): नमी के संपर्क में आने पर प्लास्टर ऑफ पेरिस जल से अभिक्रिया करके कठोर ठोस पदार्थ जिप्सम (CaSO₄·2H₂O) बना लेता है।\nसही विकल्प चुनें:',
    },
    options: [
      {id: 'a', text: {en: 'Both A and R are true, and R is the correct explanation of A', hi: 'A और R दोनों सत्य हैं, और R, A की सही व्याख्या है'}},
      {id: 'b', text: {en: 'Both A and R are true, but R is NOT the correct explanation of A', hi: 'A और R दोनों सत्य हैं, परंतु R, A की सही व्याख्या नहीं है'}},
      {id: 'c', text: {en: 'A is true, but R is false', hi: 'A सत्य है, परंतु R असत्य है'}},
      {id: 'd', text: {en: 'A is false, but R is true', hi: 'A असत्य है, परंतु R सत्य है'}},
    ],
    correctAnswer: 'a',
    explanation: {
      en: 'Per NCERT Class 10 Chemistry, CaSO₄·½H₂O + 1½H₂O → CaSO₄·2H₂O (Gypsum), which sets into a hard mass within minutes and loses its moulding property. Therefore it must be stored in moisture-proof containers.',
      hi: 'NCERT कक्षा 10 रसायन विज्ञान के अनुसार, CaSO₄·½H₂O + 1½H₂O → CaSO₄·2H₂O (जिप्सम) बनाता है जो कठोर हो जाता है और ढलाई का गुण खो देता है। अतः दोनों सत्य हैं और R सही व्याख्या है।',
    },
  },
  {
    id: 'rrb-2026-q5',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'Statement-Based', 'Biology', 'NCERT Class 10'],
    question: {
      en: 'Consider the following statements regarding human life processes (NCERT Biology):\n1. Bile juice secreted by the liver contains trypsin and pepsin enzymes to digest proteins.\n2. Bile salts break down large fat globules into smaller globules (emulsification) in the small intestine.\n3. Lack of oxygen in human muscle cells during intense exercise leads to pyruvate converting into lactic acid.\nWhich of the statements given above are correct?',
      hi: 'मानव जैव प्रक्रम (NCERT जीव विज्ञान) के संबंध में निम्नलिखित कथनों पर विचार करें:\n1. यकृत द्वारा स्रावित पित्त रस (Bile juice) में प्रोटीन पचाने वाले ट्रिप्सिन और पेप्सिन एंजाइम होते हैं।\n2. पित्त लवण छोटी आंत में बड़ी वसा गोलिकाओं को छोटी गोलिकाओं में तोड़ते हैं (इमल्सीकरण)।\n3. तीव्र व्यायाम के दौरान पेशी कोशिकाओं में ऑक्सीजन की कमी से पाइरूवेट लैक्टिक अम्ल में परिवर्तित हो जाता है।\nउपर्युक्त में से कौन-से कथन सही हैं?',
    },
    options: [
      {id: 'a', text: {en: '1 and 2 only', hi: 'केवल 1 और 2'}},
      {id: 'b', text: {en: '2 and 3 only', hi: 'केवल 2 और 3'}},
      {id: 'c', text: {en: '1 and 3 only', hi: 'केवल 1 और 3'}},
      {id: 'd', text: {en: '1, 2 and 3', hi: '1, 2 और 3'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Statement 1 is incorrect because bile juice contains NO digestive enzymes (pepsin is in gastric juice; trypsin is in pancreatic juice). Statements 2 and 3 are strictly correct per NCERT Life Processes.',
      hi: 'कथन 1 गलत है क्योंकि पित्त रस में कोई पाचक एंजाइम नहीं होता (पेप्सिन जठर रस में और ट्रिप्सिन अग्न्याशय रस में होता है)। कथन 2 और 3 पूर्णतः सही हैं।',
    },
  },
  {
    id: 'rrb-2026-q6',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'Assertion-Reason', 'Biology', 'NCERT Class 10'],
    question: {
      en: 'Assertion (A): Adrenaline hormone secreted by the adrenal glands prepares the human body for "fight or flight" emergencies.\nReason (R): Adrenaline increases heart rate and breathing rate while diverting blood supply from the digestive system and skin toward skeletal muscles.\nSelect the correct option:',
      hi: 'अभिकथन (A): अधिवृक्क ग्रंथियों (Adrenal glands) द्वारा स्रावित एड्रीनलीन हार्मोन शरीर को "लड़ो या भागो" (Fight or Flight) आपात स्थिति के लिए तैयार करता है।\nकारण (R): एड्रीनलीन हृदय गति और श्वसन दर को बढ़ाता है तथा पाचन तंत्र व त्वचा से रक्त प्रवाह को कंकाल पेशियों की ओर मोड़ता है।\nसही विकल्प चुनें:',
    },
    options: [
      {id: 'a', text: {en: 'Both A and R are true, and R is the correct explanation of A', hi: 'A और R दोनों सत्य हैं, और R, A की सही व्याख्या है'}},
      {id: 'b', text: {en: 'Both A and R are true, but R is NOT the correct explanation of A', hi: 'A और R दोनों सत्य हैं, परंतु R, A की सही व्याख्या नहीं है'}},
      {id: 'c', text: {en: 'A is true, but R is false', hi: 'A सत्य है, परंतु R असत्य है'}},
      {id: 'd', text: {en: 'A is false, but R is true', hi: 'A असत्य है, परंतु R सत्य है'}},
    ],
    correctAnswer: 'a',
    explanation: {
      en: 'Adrenaline acts directly on the heart and arterioles, supplying more oxygen to skeletal muscles while constricting blood flow to the skin and gut—making R the exact physiological explanation for A.',
      hi: 'एड्रीनलीन हृदय की धड़कन बढ़ाकर कंकाल पेशियों को अधिक ऑक्सीजन पहुँचाता है और त्वचा व पाचन तंत्र की ओर रक्त प्रवाह कम करता है—अतः R, A की सटीक व्याख्या है।',
    },
  },
  {
    id: 'rrb-2026-q7',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'RRB JE', 'Arithmetic'],
    question: {
      en: 'Two trains of lengths 180 m and 220 m are running on parallel tracks in opposite directions at speeds of 54 km/h and 90 km/h respectively. How much time will they take to completely cross each other?',
      hi: '180 मीटर और 220 मीटर लंबी दो ट्रेनें समानांतर पटरियों पर विपरीत दिशाओं में क्रमशः 54 किमी/घंटा और 90 किमी/घंटा की गति से चल रही हैं। वे एक-दूसरे को पूरी तरह पार करने में कितना समय लेंगी?',
    },
    options: [
      {id: 'a', text: {en: '8 seconds', hi: '8 सेकंड'}},
      {id: 'b', text: {en: '10 seconds', hi: '10 सेकंड'}},
      {id: 'c', text: {en: '12 seconds', hi: '12 सेकंड'}},
      {id: 'd', text: {en: '15 seconds', hi: '15 सेकंड'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Total distance = 180 + 220 = 400 m. Relative speed in opposite directions = 54 + 90 = 144 km/h = 144 × (5/18) = 40 m/s. Time = 400 / 40 = 10 seconds.',
      hi: 'कुल दूरी = 180 + 220 = 400 मीटर। विपरीत दिशाओं में सापेक्ष गति = 54 + 90 = 144 किमी/घंटा = 144 × (5/18) = 40 मीटर/सेकंड। समय = 400 / 40 = 10 सेकंड।',
    },
  },
  {
    id: 'rrb-2026-q8',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'RRB JE', 'Mensuration'],
    question: {
      en: 'A solid metallic right circular cylinder of base radius 6 cm and height 12 cm is melted and recast into identical small solid cones each of radius 3 cm and height 4 cm. How many cones are formed?',
      hi: '6 सेमी आधार त्रिज्या और 12 सेमी ऊँचाई वाले एक ठोस धातु के लंब वृत्तीय बेलन को पिघलाकर 3 सेमी त्रिज्या और 4 सेमी ऊँचाई वाले छोटे ठोस शंकु बनाए जाते हैं। कितने शंकु बनेंगे?',
    },
    options: [
      {id: 'a', text: {en: '24 cones', hi: '24 शंकु'}},
      {id: 'b', text: {en: '30 cones', hi: '30 शंकु'}},
      {id: 'c', text: {en: '36 cones', hi: '36 शंकु'}},
      {id: 'd', text: {en: '48 cones', hi: '48 शंकु'}},
    ],
    correctAnswer: 'c',
    explanation: {
      en: 'Volume of cylinder = πR²H = π × 6² × 12 = 432π cm³. Volume of 1 cone = (1/3)πr²h = (1/3) × π × 3² × 4 = 12π cm³. Number of cones = 432π / 12π = 36.',
      hi: 'बेलन का आयतन = π × 6² × 12 = 432π घन सेमी। एक शंकु का आयतन = (1/3) × π × 3² × 4 = 12π घन सेमी। शंकुओं की संख्या = 432π / 12π = 36।',
    },
  },
  {
    id: 'rrb-2026-q9',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'Profit & Loss'],
    question: {
      en: 'A merchant marks an article 40% above its cost price and allows two successive discounts of 10% and 20%. Find the net profit or loss percentage.',
      hi: 'एक व्यापारी किसी वस्तु पर उसके क्रय मूल्य से 40% अधिक मूल्य अंकित करता है और क्रमशः 10% और 20% की दो क्रमिक छूट देता है। शुद्ध लाभ या हानि प्रतिशत ज्ञात कीजिए।',
    },
    options: [
      {id: 'a', text: {en: '0.8% Profit', hi: '0.8% लाभ'}},
      {id: 'b', text: {en: '0.8% Loss', hi: '0.8% हानि'}},
      {id: 'c', text: {en: '1.2% Profit', hi: '1.2% लाभ'}},
      {id: 'd', text: {en: '2.0% Loss', hi: '2.0% हानि'}},
    ],
    correctAnswer: 'a',
    explanation: {
      en: 'Let Cost Price (CP) = ₹100. Marked Price = ₹140. After 10% and 20% successive discounts, Selling Price = 140 × 0.90 × 0.80 = 140 × 0.72 = ₹100.8. Net Profit = 0.8%.',
      hi: 'माना क्रय मूल्य = ₹100। अंकित मूल्य = ₹140। 10% और 20% की दो क्रमिक छूट के बाद विक्रय मूल्य = 140 × 0.90 × 0.80 = ₹100.8। अतः शुद्ध लाभ = 0.8%।',
    },
  },
  {
    id: 'rrb-2026-q10',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'ALP', 'RRB JE', 'Algebra'],
    question: {
      en: 'If x + (1/x) = 5, what is the value of x³ + (1/x³)?',
      hi: 'यदि x + (1/x) = 5 है, तो x³ + (1/x³) का मान क्या होगा?',
    },
    options: [
      {id: 'a', text: {en: '105', hi: '105'}},
      {id: 'b', text: {en: '110', hi: '110'}},
      {id: 'c', text: {en: '115', hi: '115'}},
      {id: 'd', text: {en: '125', hi: '125'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Using algebraic identity: x³ + 1/x³ = (x + 1/x)³ − 3(x + 1/x) = 5³ − 3(5) = 125 − 15 = 110.',
      hi: 'बीजगणितीय सर्वसमिका से: x³ + 1/x³ = (x + 1/x)³ − 3(x + 1/x) = 5³ − 3(5) = 125 − 15 = 110।',
    },
  },
  {
    id: 'rrb-2026-q11',
    section: {en: 'General Intelligence & Reasoning', hi: 'तर्कशक्ति एवं बुद्धिमत्ता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'Coding-Decoding'],
    question: {
      en: 'In a certain code language, "TRACK" is coded as "VQCBM" and "TRAIN" is coded as "VQCHP". How will "METRO" be coded in the same language?',
      hi: 'एक निश्चित कूट भाषा में "TRACK" को "VQCBM" और "TRAIN" को "VQCHP" लिखा जाता है। उसी भाषा में "METRO" को किस प्रकार लिखा जाएगा?',
    },
    options: [
      {id: 'a', text: {en: 'ODVQQ', hi: 'ODVQQ'}},
      {id: 'b', text: {en: 'OCVPQ', hi: 'OCVPQ'}},
      {id: 'c', text: {en: 'ODWQQ', hi: 'ODWQQ'}},
      {id: 'd', text: {en: 'OFVQP', hi: 'OFVQP'}},
    ],
    correctAnswer: 'a',
    explanation: {
      en: 'Alternating letter-shift pattern (+2, −1, +2, −1, +2): T+2=V, R−1=Q, A+2=C, C−1=B, K+2=M. Applying the same rule to METRO: M+2=O, E−1=D, T+2=V, R−1=Q, O+2=Q ⇒ ODVQQ.',
      hi: 'एकांतर अक्षर-स्थानांतरण पैटर्न (+2, −1, +2, −1, +2): T+2=V, R−1=Q, A+2=C, C−1=B, K+2=M। यही नियम METRO पर लगाने पर: M+2=O, E−1=D, T+2=V, R−1=Q, O+2=Q ⇒ ODVQQ।',
    },
  },
  {
    id: 'rrb-2026-q12',
    section: {en: 'General Intelligence & Reasoning', hi: 'तर्कशक्ति एवं बुद्धिमत्ता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'Syllogism'],
    question: {
      en: 'Statements:\n1. All Locomotives are Engines.\n2. Some Engines are Electric.\n3. No Electric is Steam.\nConclusions:\nI. Some Locomotives are Electric.\nII. Some Engines are not Steam.\nIII. All Steam being Engines is a possibility.\nWhich conclusions logically follow?',
      hi: 'कथन:\n1. सभी लोकोमोटिव इंजन हैं।\n2. कुछ इंजन इलेक्ट्रिक हैं।\n3. कोई भी इलेक्ट्रिक स्टीम नहीं है।\nनिष्कर्ष:\nI. कुछ लोकोमोटिव इलेक्ट्रिक हैं।\nII. कुछ इंजन स्टीम नहीं हैं।\nIII. सभी स्टीम के इंजन होने की संभावना है।\nकौन-सा/से निष्कर्ष तार्किक रूप से अनुसरण करता/करते हैं?',
    },
    options: [
      {id: 'a', text: {en: 'Only I and II follow', hi: 'केवल I और II अनुसरण करते हैं'}},
      {id: 'b', text: {en: 'Only II and III follow', hi: 'केवल II और III अनुसरण करते हैं'}},
      {id: 'c', text: {en: 'Only I and III follow', hi: 'केवल I और III अनुसरण करते हैं'}},
      {id: 'd', text: {en: 'All I, II and III follow', hi: 'सभी I, II और III अनुसरण करते हैं'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Conclusion I does not definitely follow as there is no direct relation between Locomotives and Electric. Conclusion II follows because the part of Engines that is Electric can never be Steam. Conclusion III follows as all Steam can lie within the non-Electric portion of Engines.',
      hi: 'निष्कर्ष I निश्चित नहीं है क्योंकि लोकोमोटिव और इलेक्ट्रिक में सीधा संबंध नहीं दिया है। निष्कर्ष II सही है क्योंकि इंजन का जो भाग इलेक्ट्रिक है वह स्टीम नहीं हो सकता। निष्कर्ष III संभावना के रूप में सही है।',
    },
  },
  {
    id: 'rrb-2026-q13',
    section: {en: 'General Intelligence & Reasoning', hi: 'तर्कशक्ति एवं बुद्धिमत्ता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'Statement-Assumption'],
    question: {
      en: 'Statement: Indian Railways has accelerated the deployment of the indigenous Kavach 4.0 Automatic Train Protection (ATP) system across high-density routes to prevent SPAD (Signal Passed at Danger) incidents.\nAssumptions:\nI. Low visibility or human oversight during signal observation has been a risk factor on busy routes.\nII. Automated onboard braking intervention can prevent collisions even if a loco pilot misses a danger signal.\nWhich assumption(s) is/are implicit?',
      hi: 'कथन: भारतीय रेलवे ने SPAD (खतरे में सिग्नल पार करना) घटनाओं को रोकने के लिए उच्च-घनत्व वाले रेल मार्गों पर स्वदेशी "कवच 4.0" ऑटोमैटिक ट्रेन प्रोटेक्शन (ATP) प्रणाली की तैनाती तेज कर दी है।\nपूर्वधारणाएं:\nI. व्यस्त मार्गों पर कम दृश्यता या मानवीय चूक सिग्नल देखने में जोखिम का कारण रही है।\nII. लोको पायलट द्वारा खतरे का सिग्नल चूकने पर भी स्वचालित ब्रेकिंग हस्तक्षेप टक्कर को रोक सकता है।\nकौन-सी पूर्वधारणा(एं) अंतर्निहित है/हैं?',
    },
    options: [
      {id: 'a', text: {en: 'Only Assumption I is implicit', hi: 'केवल पूर्वधारणा I अंतर्निहित है'}},
      {id: 'b', text: {en: 'Only Assumption II is implicit', hi: 'केवल पूर्वधारणा II अंतर्निहित है'}},
      {id: 'c', text: {en: 'Both I and II are implicit', hi: 'I और II दोनों अंतर्निहित हैं'}},
      {id: 'd', text: {en: 'Neither I nor II is implicit', hi: 'न तो I और न ही II अंतर्निहित है'}},
    ],
    correctAnswer: 'c',
    explanation: {
      en: 'Both assumptions are directly implicit: deploying Kavach 4.0 ATP specifically assumes SPAD/human oversight risks exist on busy routes (I) and that automated braking intervention mitigates those risks (II).',
      hi: 'दोनों पूर्वधारणाएं अंतर्निहित हैं: कवच 4.0 ATP प्रणाली की तैनाती इसी मान्यता पर आधारित है कि व्यस्त मार्गों पर मानवीय चूक का जोखिम है (I) और स्वचालित ब्रेकिंग इसे रोक सकती है (II)।',
    },
  },
  {
    id: 'rrb-2026-q14',
    section: {en: 'General Awareness', hi: 'सामान्य जागरूकता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'RRB JE', 'Indian Railways GK', 'Current Affairs'],
    question: {
      en: 'Consider the following statements regarding modern Indian Railways infrastructure:\n1. India’s first underwater metro river tunnel under the Hooghly River operates between Howrah Maidan and Esplanade in Kolkata.\n2. The Chenab Rail Bridge, standing 359 metres above the river bed, is part of the Udhampur–Srinagar–Baramulla Rail Link (USBRL) project.\n3. The Railway Protection Force (RPF) functions administratively under the Ministry of Home Affairs.\nWhich of the statements given above are correct?',
      hi: 'आधुनिक भारतीय रेलवे बुनियादी ढांचे के संबंध में निम्नलिखित कथनों पर विचार करें:\n1. हुगली नदी के नीचे भारत की पहली अंडरवाटर मेट्रो सुरंग कोलकाता में हावड़ा मैदान और एस्प्लेनेड के बीच संचालित होती है।\n2. नदी तल से 359 मीटर ऊँचा चिनाब रेल पुल उधमपुर–श्रीनगर–बारामूला रेल लिंक (USBRL) परियोजना का हिस्सा है।\n3. रेलवे सुरक्षा बल (RPF) प्रशासनिक रूप से गृह मंत्रालय के अधीन कार्य करता है।\nउपर्युक्त में से कौन-से कथन सही हैं?',
    },
    options: [
      {id: 'a', text: {en: '1 and 2 only', hi: 'केवल 1 और 2'}},
      {id: 'b', text: {en: '2 and 3 only', hi: 'केवल 2 और 3'}},
      {id: 'c', text: {en: '1 and 3 only', hi: 'केवल 1 और 3'}},
      {id: 'd', text: {en: '1, 2 and 3', hi: '1, 2 और 3'}},
    ],
    correctAnswer: 'a',
    explanation: {
      en: 'Statements 1 and 2 are correct. Statement 3 is incorrect because the Railway Protection Force (RPF) operates under the Ministry of Railways, Government of India (not the Ministry of Home Affairs).',
      hi: 'कथन 1 और 2 सही हैं। कथन 3 गलत है क्योंकि रेलवे सुरक्षा बल (RPF) गृह मंत्रालय के नहीं, बल्कि भारत सरकार के रेल मंत्रालय के अधीन कार्य करता है।',
    },
  },
  {
    id: 'rrb-2026-q15',
    section: {en: 'General Awareness', hi: 'सामान्य जागरूकता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0.33,
    tags: ['2026-27 Syllabus Practice', 'RRB NTPC', 'Group D', 'ALP', 'RRB JE', 'Indian Railways GK', 'Current Affairs'],
    question: {
      en: 'Consider the following statements about Indian Railways Zones, Track Gauge, and Green Goals:\n1. Indian Railways has set a target to become a Net Zero Carbon Emitter by the year 2030.\n2. East Central Railway (ECR) is headquartered at Hajipur, while South East Central Railway (SECR) is headquartered at Bilaspur.\n3. Standard Broad Gauge width used across Indian Railways mainlines is 1,000 mm.\nWhich of the statements given above are correct?',
      hi: 'भारतीय रेलवे के ज़ोन, ट्रैक गेज और हरित लक्ष्यों के बारे में निम्नलिखित कथनों पर विचार करें:\n1. भारतीय रेलवे ने वर्ष 2030 तक नेट ज़ीरो कार्बन उत्सर्जक (Net Zero Carbon Emitter) बनने का लक्ष्य रखा है।\n2. पूर्व मध्य रेलवे (ECR) का मुख्यालय हाजीपुर में है, जबकि दक्षिण पूर्व मध्य रेलवे (SECR) का मुख्यालय बिलासपुर में है।\n3. भारतीय रेलवे की मुख्य लाइनों में उपयोग की जाने वाली ब्रॉड गेज (बड़ी लाइन) की चौड़ाई 1,000 मिमी होती है।\nउपर्युक्त में से कौन-से कथन सही हैं?',
    },
    options: [
      {id: 'a', text: {en: '1 only', hi: 'केवल 1'}},
      {id: 'b', text: {en: '1 and 2 only', hi: 'केवल 1 और 2'}},
      {id: 'c', text: {en: '2 and 3 only', hi: 'केवल 2 और 3'}},
      {id: 'd', text: {en: '1, 2 and 3', hi: '1, 2 और 3'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Statements 1 and 2 are correct (Net Zero target: 2030; ECR: Hajipur; SECR: Bilaspur). Statement 3 is incorrect because Broad Gauge width in India is 1,676 mm (1,000 mm is Metre Gauge).',
      hi: 'कथन 1 और 2 सही हैं (नेट ज़ीरो लक्ष्य: 2030; ECR: हाजीपुर; SECR: बिलासपुर)। कथन 3 गलत है क्योंकि भारत में ब्रॉड गेज की चौड़ाई 1,676 मिमी होती है (1,000 मिमी मीटर गेज होता है)।',
    },
  },
];

export const SAMPLE_DEV_QUESTIONS: Question[] = [
  ...BASE_SAMPLE_DEV_QUESTIONS,
  ...RRB_NTPC_JSSC_CGL_QUESTIONS,
  ...RAILWAY_2026_27_QUESTIONS,
];

export const DAILY_QUIZ_QUESTIONS: Question[] = [
  {
    id: 'daily-q1',
    section: {en: 'General Awareness', hi: 'सामान्य जागरूकता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0,
    isSampleDevData: true,
    question: {
      en: 'Where is the headquarters of the Reserve Bank of India (RBI) located?',
      hi: 'भारतीय रिज़र्व बैंक (RBI) का मुख्यालय कहाँ स्थित है?',
    },
    options: [
      {id: 'a', text: {en: 'New Delhi', hi: 'नई दिल्ली'}},
      {id: 'b', text: {en: 'Mumbai', hi: 'मुंबई'}},
      {id: 'c', text: {en: 'Kolkata', hi: 'कोलकाता'}},
      {id: 'd', text: {en: 'Chennai', hi: 'चेन्नई'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'RBI was initially established in Kolkata in 1935, and permanently moved to Mumbai in 1937.',
      hi: 'RBI की स्थापना 1935 में कोलकाता में हुई थी और 1937 में इसे स्थायी रूप से मुंबई स्थानांतरित किया गया।',
    },
  },
  {
    id: 'daily-q2',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0,
    isSampleDevData: true,
    question: {
      en: 'A shopkeeper sells an article for ₹720 at a profit of 20%. What was the cost price of the article?',
      hi: 'एक दुकानदार एक वस्तु को 20% लाभ पर ₹720 में बेचता है। वस्तु का क्रय मूल्य क्या था?',
    },
    options: [
      {id: 'a', text: {en: '₹580', hi: '₹580'}},
      {id: 'b', text: {en: '₹600', hi: '₹600'}},
      {id: 'c', text: {en: '₹620', hi: '₹620'}},
      {id: 'd', text: {en: '₹640', hi: '₹640'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Cost Price = Selling Price / 1.20 = 720 / 1.20 = ₹600.',
      hi: 'क्रय मूल्य = विक्रय मूल्य / 1.20 = 720 / 1.20 = ₹600।',
    },
  },
  {
    id: 'daily-q3',
    section: {en: 'General Science & Tech', hi: 'सामान्य विज्ञान एवं तकनीक'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0,
    isSampleDevData: true,
    question: {
      en: 'Which vitamin deficiency is the primary cause of Scurvy?',
      hi: 'स्कर्वी रोग मुख्य रूप से किस विटामिन की कमी से होता है?',
    },
    options: [
      {id: 'a', text: {en: 'Vitamin A', hi: 'विटामिन A'}},
      {id: 'b', text: {en: 'Vitamin B12', hi: 'विटामिन B12'}},
      {id: 'c', text: {en: 'Vitamin C', hi: 'विटामिन C'}},
      {id: 'd', text: {en: 'Vitamin D', hi: 'विटामिन D'}},
    ],
    correctAnswer: 'c',
    explanation: {
      en: 'Vitamin C (Ascorbic acid) deficiency causes Scurvy, leading to bleeding gums and delayed wound healing.',
      hi: 'विटामिन C (एस्कॉर्बिक एसिड) की कमी से स्कर्वी होता है, जिससे मसूड़ों से खून आना और घाव भरने में देरी होती है।',
    },
  },
  {
    id: 'daily-q4',
    section: {en: 'General Intelligence & Reasoning', hi: 'तर्कशक्ति एवं बुद्धिमत्ता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0,
    isSampleDevData: true,
    question: {
      en: 'If DELHI is coded as 73541 and CALCUTTA as 82589662, how is CALICUT coded?',
      hi: 'यदि DELHI को 73541 और CALCUTTA को 82589662 लिखा जाता है, तो CALICUT को कैसे लिखा जाएगा?',
    },
    options: [
      {id: 'a', text: {en: '8251896', hi: '8251896'}},
      {id: 'b', text: {en: '8251986', hi: '8251986'}},
      {id: 'c', text: {en: '8521896', hi: '8521896'}},
      {id: 'd', text: {en: '5281896', hi: '5281896'}},
    ],
    correctAnswer: 'a',
    explanation: {
      en: 'Direct letter-to-digit substitution: C=8, A=2, L=5, I=1, C=8, U=9, T=6 -> 8251896.',
      hi: 'सीधा अक्षर-से-अंक प्रतिस्थापन: C=8, A=2, L=5, I=1, C=8, U=9, T=6 -> 8251896।',
    },
  },
  {
    id: 'daily-q5',
    section: {en: 'General Awareness', hi: 'सामान्य जागरूकता'},
    type: 'MCQ',
    marks: 1,
    negativeMark: 0,
    isSampleDevData: true,
    question: {
      en: 'Which river is known as the "Sorrow of Bihar" due to frequent course changes and floods?',
      hi: 'बार-बार मार्ग बदलने और बाढ़ के कारण किस नदी को "बिहार का शोक" कहा जाता है?',
    },
    options: [
      {id: 'a', text: {en: 'Son River', hi: 'सोन नदी'}},
      {id: 'b', text: {en: 'Gandak River', hi: 'गंडक नदी'}},
      {id: 'c', text: {en: 'Kosi River', hi: 'कोसी नदी'}},
      {id: 'd', text: {en: 'Damodar River', hi: 'दामोदर नदी'}},
    ],
    correctAnswer: 'c',
    explanation: {
      en: 'The Kosi River carries heavy silt from Nepal and frequently shifts its course, earning the name "Sorrow of Bihar".',
      hi: 'कोसी नदी नेपाल से भारी गाद लाती है और अक्सर अपना मार्ग बदलती है, इसलिए इसे "बिहार का शोक" कहा जाता है।',
    },
  },
];
