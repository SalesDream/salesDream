export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-800">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-lg mb-6">Oops! The page you are looking for does not exist.</p>
      <a
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Go Home
      </a>
    </div>
  );
}
