import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Enter Your Destination",
      description: "Pick your origin and destination anywhere in Nagpur by name, stop, or map tap.",
    },
    {
      number: "02",
      title: "Explore Pareto Optimal Routes",
      description: "A* multi-objective engine compares metro, bus, and pedestrian walking alternatives in real-time.",
    },
    {
      number: "03",
      title: "Travel Green & Track CO₂",
      description: "Choose routes that optimize travel time, minimize walking, and maximize carbon offset savings.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-muted/30 border-b border-border relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Plan Your Journey in 3 Simple Steps
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6">
            Intelligent multimodal navigation engineered for Nagpur
          </p>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full"></div>
        </div>

        <div className="relative">
          {/* Connecting Line for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-blue-300 via-primary to-emerald-300 dark:from-blue-900 dark:via-primary dark:to-emerald-900 transform -translate-y-1/2 z-0"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-card border-4 border-primary/20 shadow-xl flex items-center justify-center mb-8 relative z-10 transition hover:scale-110">
                  <span className="text-3xl font-bold text-primary">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4 bg-card px-4 py-1.5 rounded-full shadow-sm border border-border">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
