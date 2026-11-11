import { Link, Navigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, User } from "lucide-react";
import { BLOG_POSTS, findPost } from "../data/blogPosts";
import styles from "./BlogPostPage.module.css";

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = findPost(slug);
  if (!post) return <Navigate to="/blog" replace />;

  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug);

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/blog" className={styles.back}>
            <ArrowLeft size={16} /> All posts
          </Link>
          <span className={styles.category}>{post.category}</span>
          <h1>{post.title}</h1>
          <div className={styles.meta}>
            <User size={15} aria-hidden="true" /> {post.author}
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.content}>
          <img src={post.image} alt="" className={styles.hero} />
          <div className={styles.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>
        </div>

        <aside className={styles.aside}>
          <h2>More from the blog</h2>
          {others.map((p) => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className={styles.related}>
              <img src={p.thumb} alt="" loading="lazy" />
              <span>{p.title}</span>
            </Link>
          ))}
        </aside>
      </div>
    </article>
  );
}
