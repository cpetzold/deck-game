import State from "./State";

export default abstract class Action {
  abstract async resolve(state: State): Promise<void>;
}
