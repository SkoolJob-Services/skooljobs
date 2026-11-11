import { media } from "../siteConfig";

// Blog posts from the website, kept in the app as markdown.
export const BLOG_POSTS = [
  {
    slug: "how-schools-can-attract-and-retain-great-teachers",
    title: "How Schools Can Attract and Retain Great Teachers",
    author: "SkoolJobs Team",
    category: "For Schools",
    thumb: media("2026/05/pexels-photo-12758782-12758782-150x150.jpg"),
    image: media("2026/05/pexels-photo-12758782-12758782-683x1024.jpg"),
    excerpt:
      "Hiring talented teachers is important, but retaining them is equally essential for maintaining educational quality.",
    body: `Hiring talented teachers is important, but retaining them is equally essential for maintaining educational quality.

Schools that support and value educators often experience:

- Better student performance
- Lower staff turnover
- Stronger institutional reputation

### Ways Schools Can Retain Quality Teachers

#### Offer Professional Growth

Provide:

- Workshops
- Certifications
- Training programs
- Leadership opportunities

#### Create Positive Work Culture

Healthy communication and respectful management improve teacher satisfaction.

#### Provide Competitive Salaries

Fair compensation helps institutions retain experienced educators.

#### Encourage Innovation

Allow teachers to use creative teaching methods and digital tools.

#### Recognize Achievements

Appreciating teacher efforts boosts motivation and loyalty.

Schools that invest in teachers ultimately build stronger learning environments and long-term success.`,
  },
  {
    slug: "benefits-of-online-teaching-jobs-for-educators",
    title: "Benefits of Online Teaching Jobs for Educators",
    author: "SkoolJobs Team",
    category: "For Teachers",
    thumb: media("2026/05/pexels-photo-36781271-36781271-150x150.jpg"),
    image: media("2026/05/pexels-photo-36781271-36781271-1024x683.jpg"),
    excerpt:
      "Online teaching has transformed the education sector and opened new career opportunities for teachers across India.",
    body: `Online teaching has transformed the education sector and opened new career opportunities for teachers across India.

Today, educators can teach students from different cities and even countries without leaving their homes.

### Major Benefits of Online Teaching

#### Flexible Work Schedule

Teachers can choose suitable timings and manage work-life balance effectively.

#### Better Income Opportunities

Many online educators earn through:

- Live classes
- Recorded courses
- Private tutoring
- Subscription-based learning

#### Wider Student Reach

Teachers are no longer limited to local institutions.

#### Skill Development

Online teaching improves:

- Communication
- Technology usage
- Presentation skills
- Content creation

#### Work From Anywhere

Teachers can conduct classes remotely using laptops, tablets, and smartphones.

As digital education continues growing, online teaching careers are becoming one of the fastest-growing opportunities in the education industry.`,
  },
  {
    slug: "why-schools-struggle-to-hire-quality-teachers",
    title: "Why Schools Struggle to Hire Quality Teachers",
    author: "SkoolJobs Team",
    category: "For Schools",
    thumb: media("2026/05/pexels-photo-35552523-35552523-150x150.jpg"),
    image: media("2026/05/pexels-photo-35552523-35552523-1024x683.jpg"),
    excerpt:
      "Many schools across India face difficulties in finding qualified and reliable teachers.",
    body: `Many schools across India face difficulties in finding qualified and reliable teachers. The growing demand for skilled educators has created intense competition among institutions.

Some major hiring challenges schools face include:

- Shortage of experienced teachers
- High teacher turnover
- Lack of verified candidate profiles
- Delayed recruitment process
- Poor communication between schools and applicants

To solve these problems, schools are increasingly adopting digital recruitment platforms that simplify teacher hiring.

Modern hiring platforms help schools:

- Search verified teacher profiles
- Conduct faster recruitment
- Schedule interviews online
- Access location-based hiring
- Save recruitment costs and time

The future of education recruitment depends on smart technology and transparent hiring systems.`,
  },
];

export const findPost = (slug) => BLOG_POSTS.find((p) => p.slug === slug);
