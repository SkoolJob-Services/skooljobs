import { Link } from "react-router-dom";
import { User } from "lucide-react";
import PageBanner from "../components/PageBanner";
import { BLOG_POSTS } from "../data/blogPosts";
import styles from "./BlogPage.module.css";

export default function BlogPage() {
  return (
    <>
      <PageBanner variant="outlineCircles" tag="Blog" title="SkoolJobs Blog Posts">
        Explore the latest opportunities, career advice, hiring insights, teaching resources, and education trends for
        teachers, schools, and institutions through a trusted education recruitment platform.
      </PageBanner>

      <section className={styles.section}>
        <div className={styles.grid}>
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className={styles.card}>
              <Link to={`/blog/${post.slug}`} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                <img src={post.image} alt="" loading="lazy" />
              </Link>
              <div className={styles.body}>
                <span className={styles.category}>{post.category}</span>
                <h2>
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <div className={styles.meta}>
                  <User size={14} aria-hidden="true" /> {post.author}
                </div>
                <p>{post.excerpt}</p>
                <Link to={`/blog/${post.slug}`} className={styles.more}>
                  Learn more →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
