export interface Theme {
  id: string;
  name: string;
  description: string;
  className: string;
  preview: {
    background: string;
    text: string;
    accent: string;
    card: string;
    border: string;
  };
  layout: {
    container: string;
    header: string;
    content: string;
    profile: string;
  };
}

export const themes: Theme[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and minimal design with centered profile",
    className: "theme-minimal",
    preview: {
      background: "bg-white",
      text: "text-slate-800",
      accent: "bg-slate-800 text-white",
      card: "bg-white border-2 border-slate-100 hover:border-slate-200 transition-colors",
      border: "border-slate-200",
    },
    layout: {
      container: "grid grid-cols-1 lg:grid-cols-12 gap-8",
      header: "lg:col-span-4 flex justify-center",
      content: "lg:col-span-8",
      profile: "sticky top-8 flex flex-col items-center",
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with gradients and floating cards",
    className: "theme-modern",
    preview: {
      background: "bg-gradient-to-br from-indigo-50 via-white to-purple-50",
      text: "text-gray-900",
      accent:
        "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm",
      card: "bg-white/80 backdrop-blur-sm shadow-xl rounded-xl border border-white/20 hover:shadow-2xl transition-all",
      border: "border-white/20",
    },
    layout: {
      container: "max-w-4xl mx-auto",
      header: "mb-16 flex flex-col items-center",
      content: "grid gap-8",
      profile: "flex flex-col items-center",
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Sophisticated grid layout with bold typography",
    className: "theme-elegant",
    preview: {
      background: "bg-stone-50",
      text: "text-stone-900",
      accent: "bg-stone-900 text-stone-50",
      card: "bg-white shadow-[0_2px_40px_-12px_rgba(0,0,0,0.1)] rounded-none border-l-4 border-stone-900 hover:shadow-[0_2px_40px_-8px_rgba(0,0,0,0.15)] transition-all",
      border: "border-stone-200",
    },
    layout: {
      container: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12",
      header: "col-span-full flex justify-center",
      content:
        "col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
      profile: "flex flex-col items-center",
    },
  },
];
