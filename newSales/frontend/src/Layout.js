import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

export default function Layout({ children }){
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `
          radial-gradient(900px 900px at 10% 20%, rgba(49,166,247,0.08), transparent),
          radial-gradient(800px 800px at 80% 10%, rgba(99,102,241,0.08), transparent),
          var(--bg-page)
        `,
      }}
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 px-4 lg:px-8 pt-4 pb-4 overflow-hidden">
          <div className="max-w-7xl mx-auto w-full h-full overflow-hidden flex flex-col">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );

}
