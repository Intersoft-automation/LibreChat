import { createSubagentAliasResolver } from './aliases';

describe('createSubagentAliasResolver', () => {
  it('returns no alias when the feature is disabled', () => {
    const resolve = createSubagentAliasResolver({ enabled: false, names: ['Petra'] });

    expect(resolve('run-1')).toBeUndefined();
  });

  it('keeps an assignment stable for the lifetime of a request', () => {
    const resolve = createSubagentAliasResolver({ enabled: true, names: ['Petra', 'Jakub'] });

    expect(resolve('run-1')).toBe(resolve('run-1'));
  });

  it('does not repeat names while unused pool entries remain', () => {
    const resolve = createSubagentAliasResolver({
      enabled: true,
      names: ['Petra', 'Jakub', 'Tereza'],
    });

    const assigned = [resolve('run-1'), resolve('run-2'), resolve('run-3')];
    expect(new Set(assigned).size).toBe(3);
  });

  it('adds a suffix after the pool is exhausted', () => {
    const resolve = createSubagentAliasResolver({ enabled: true, names: ['Petra'] });

    expect(resolve('run-1')).toBe('Petra');
    expect(resolve('run-2')).toBe('Petra 2');
    expect(resolve('run-3')).toBe('Petra 3');
  });

  it('normalizes duplicate configured names', () => {
    const resolve = createSubagentAliasResolver({
      enabled: true,
      names: [' Petra ', 'petra', 'Jakub'],
    });

    const assigned = [resolve('run-1'), resolve('run-2')];
    expect(new Set(assigned).size).toBe(2);
    expect(assigned).toEqual(expect.arrayContaining(['Petra', 'Jakub']));
  });
});
