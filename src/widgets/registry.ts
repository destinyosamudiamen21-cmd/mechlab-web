import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

export type WidgetProps = { topicSlug: string };
type Widget = LazyExoticComponent<ComponentType<WidgetProps>>;

// The backend says which widget a topic uses (topic.widget = "MohrCircle").
// This map turns that name into a component. One line per widget, loaded only when needed.
const WIDGETS: Record<string, Widget> = {
  MohrCircle: lazy(() => import("./MohrCircle")),
  PistonCylinder: lazy(() => import("./PistonCylinder")),
  EngineCycle: lazy(() => import("./EngineCycle")),
  SystemsExplorer: lazy(() => import("./SystemsExplorer")),
  PathFunctions: lazy(() => import("./PathFunctions")),
  PhaseChange: lazy(() => import("./PhaseChange")),
  FirstLawCycle: lazy(() => import("./FirstLawCycle")),
  SteadyFlow: lazy(() => import("./SteadyFlow")),
  BernoulliPipe: lazy(() => import("./BernoulliPipe")),
  GasTurbine: lazy(() => import("./GasTurbine")),
  CarnotCycle: lazy(() => import("./CarnotCycle")),
  BeamShear: lazy(() => import("./BeamShear")),
  ShearFlow: lazy(() => import("./ShearFlow")),
  ShearCentre: lazy(() => import("./ShearCentre")),
  UniformStrength: lazy(() => import("./UniformStrength")),
  CompositeBeam: lazy(() => import("./CompositeBeam")),
  UnsymmetricalBending: lazy(() => import("./UnsymmetricalBending")),
  BeamDeflection: lazy(() => import("./BeamDeflection")),
  StrainCircle: lazy(() => import("./StrainCircle")),
  PressureVessel: lazy(() => import("./PressureVessel")),
  FailureTheories: lazy(() => import("./FailureTheories")),
  HelicalSpring: lazy(() => import("./HelicalSpring")),
  ProjectileMotion: lazy(() => import("./ProjectileMotion")),
  InclineBlock: lazy(() => import("./InclineBlock")),
  EnergyTrack: lazy(() => import("./EnergyTrack")),
  SpinningPlatform: lazy(() => import("./SpinningPlatform")),
  OrbitExplorer: lazy(() => import("./OrbitExplorer")),
  ChargeField: lazy(() => import("./ChargeField")),
  CapacitorPlates: lazy(() => import("./CapacitorPlates")),
  ResistorCircuit: lazy(() => import("./ResistorCircuit")),
  ParallelWires: lazy(() => import("./ParallelWires")),
  CoilGenerator: lazy(() => import("./CoilGenerator")),
  ACCircuit: lazy(() => import("./ACCircuit")),
};

export function getWidget(name: string | null | undefined): Widget | undefined {
  return name ? WIDGETS[name] : undefined;
}
