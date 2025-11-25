import Header from "./Header";       // If using src/components/Header.js → "./components/Header"
import Sidebar from "./Sidebar";     // Or "./components/Sidebar"
import Footer from "./Footer";       // Or "./components/Footer"

export default function Layout({ children }) {
  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">
          <div className="bg-white shadow rounded-xl p-4">{children}</div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
