export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 px-10 pt-10 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <h2 className="text-base">
        Sorry, the page <pre className="inline-block">{window.location.pathname}</pre> does not
        exist.
      </h2>
      <a href="/" className="mt-5">
        Go to home page
      </a>
    </div>
  );
}
