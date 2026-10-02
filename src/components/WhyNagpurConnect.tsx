import React from "react";
import { Network, Link2, Map as MapIcon, LineChart } from "lucide-react";

export default function WhyNagpurConnect() {
  const points = [
    {
      icon: Network,
      title: "Seamless Multimodal Journeys",
      description:
        "We connect Aapli Bus routes, Orange & Blue Metro corridors, and real-road pedestrian paths into unified door-to-door itineraries.",
    },
    {
      icon: Link2,
      title: "First & Last-Mile Connectivity",
      description:
        "OpenRouteService pedestrian routing accurately computes actual street walking distances and times to transit stops.",
    },
    {
      icon: MapIcon,
      title: "Realistic Transit Geometry",
      description:
        "Accurate curved road polylines and elevated metro viaduct coordinates mapped across all Nagpur sectors.",
    },
    {
      icon: LineChart,
      title: "Pareto Multi-Objective Engine",
      description:
        "Compare routes across four dimensions simultaneously: duration, walking effort, transfers, and carbon footprint.",
    },
  ];

  return (
    <section className="py-24 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-1">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Why Eco Move Nagpur?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We are rethinking urban mobility across Nagpur. By integrating public transit networks with AI-powered multi-objective routing, sustainable transit becomes the fastest and easiest choice.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {points.map((point, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-2xl hover:bg-muted/40 transition">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <point.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{point.title}</h3>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
