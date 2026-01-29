import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

export default function Layout({ children }){
  return (
    <div className="min-h-screen flex flex-col app-shell">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 px-4 lg:px-8 pt-2 pb-2 overflow-auto">
          <div className="max-w-7xl mx-auto w-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );

}
