// Types partages utilises par ce module.
declare module "seedrandom" {
  interface PRNG {
    (): number;
    int32(): number;
    quick(): number;
    double(): number;
    state?(): unknown;
  }

  interface SeedRandomOptions {
    entropy?: boolean;
    global?: boolean;
  }

  function seedrandom(seed?: string, options?: SeedRandomOptions): PRNG;

  export default seedrandom;
}
