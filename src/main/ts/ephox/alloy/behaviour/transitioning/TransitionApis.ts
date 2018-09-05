import { Objects } from '@ephox/boulder';
import { Fun, Option } from '@ephox/katamari';
import { Attr, Class } from '@ephox/sugar';
import { AlloyComponent } from '../../api/component/ComponentApi';
import { Stateless } from '../../behaviour/common/BehaviourState';
import { TransitioningConfig } from '../../behaviour/transitioning/TransitioningTypes';

export interface TransitionRoute {
  destination: () => string;
  start: () => string;
}

// TYPIFY
const findRoute = function <T>(component: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless, route: TransitionRoute): Option<any> {
  return Objects.readOptFrom(transConfig.routes(), route.start()).map(Fun.apply).bind((sConfig) => {
    return Objects.readOptFrom(sConfig, route.destination()).map(Fun.apply);
  });
};

const getTransition = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless) => {
  const route = getCurrentRoute(comp, transConfig, transState);
  return route.bind((r) => {
    return getTransitionOf(comp, transConfig, transState, r);
  });
};

const getTransitionOf = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless, route: TransitionRoute): Option<any> => {
  return findRoute(comp, transConfig, transState, route).bind((r) => {
    return r.transition().map((t) => {
      return {
        transition: Fun.constant(t),
        route: Fun.constant(r)
      };
    });
  });
};

const disableTransition = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless) => {
  // Disable the current transition
  getTransition(comp, transConfig, transState).each((routeTransition: any) => {
    const t = routeTransition.transition();
    Class.remove(comp.element(), t.transitionClass());
    Attr.remove(comp.element(), transConfig.destinationAttr());
  });
};

const getNewRoute = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless, destination: string) => {
  return {
    start: Fun.constant(Attr.get(comp.element(), transConfig.stateAttr())),
    destination: Fun.constant(destination)
  };
};

const getCurrentRoute = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless) => {
  const el = comp.element();
  return Attr.has(el, transConfig.destinationAttr()) ? Option.some({
    start: Fun.constant(Attr.get(comp.element(), transConfig.stateAttr())),
    destination: Fun.constant(Attr.get(comp.element(), transConfig.destinationAttr()))
  }) : Option.none();
};

const jumpTo = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless, destination: string) => {
  // Remove the previous transition
  disableTransition(comp, transConfig, transState);
  // Only call finish if there was an original state
  if (Attr.has(comp.element(), transConfig.stateAttr()) && Attr.get(comp.element(), transConfig.stateAttr()) !== destination) { transConfig.onFinish()(comp, destination); }
  Attr.set(comp.element(), transConfig.stateAttr(), destination);
};

const fasttrack = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless, destination: string) => {
  if (Attr.has(comp.element(), transConfig.destinationAttr())) {
    Attr.set(comp.element(), transConfig.stateAttr(), Attr.get(comp.element(), transConfig.destinationAttr()));
    Attr.remove(comp.element(), transConfig.destinationAttr());
  }
};

const progressTo = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless, destination: string) => {
  fasttrack(comp, transConfig, transState, destination);
  const route = getNewRoute(comp, transConfig, transState, destination);
  getTransitionOf(comp, transConfig, transState, route).fold(() => {
    jumpTo(comp, transConfig, transState, destination);
  }, (routeTransition) => {
    disableTransition(comp, transConfig, transState);
    const t = routeTransition.transition();
    Class.add(comp.element(), t.transitionClass());
    Attr.set(comp.element(), transConfig.destinationAttr(), destination);
  });
};

const getState = (comp: AlloyComponent, transConfig: TransitioningConfig, transState: Stateless) => {
  const e = comp.element();
  return Attr.has(e, transConfig.stateAttr()) ? Option.some(
    Attr.get(e, transConfig.stateAttr())
  ) : Option.none();
};

export {
  findRoute,
  disableTransition,
  getCurrentRoute,
  jumpTo,
  progressTo,
  getState
};