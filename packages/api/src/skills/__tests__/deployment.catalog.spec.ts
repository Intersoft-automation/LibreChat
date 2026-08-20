import path from 'path';
import { loadDeploymentSkillsFromDirectory } from '../deployment';

const EXPECTED_SKILLS = [
  'centrala',
  'mssql-performance',
  'sql-code-review',
  'sql-query-authoring',
];

describe('checked-in deployment skill catalog', () => {
  it('loads every deployment skill with a non-escalating invocation policy', async () => {
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const registry = await loadDeploymentSkillsFromDirectory(path.join(projectRoot, 'skill'), {
      projectRoot,
      explicitlyConfigured: true,
    });
    const skillsByName = new Map(registry.list().map((skill) => [skill.name, skill]));

    expect([...skillsByName.keys()].sort()).toEqual(EXPECTED_SKILLS);
    for (const name of EXPECTED_SKILLS) {
      const skill = skillsByName.get(name);
      expect(skill).toBeDefined();
      expect(skill).toMatchObject({
        alwaysApply: false,
        disableModelInvocation: false,
        userInvocable: true,
      });
      expect(skill?.allowedTools).toBeUndefined();
    }
  });

  it('bundles every referenced document', async () => {
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const registry = await loadDeploymentSkillsFromDirectory(path.join(projectRoot, 'skill'), {
      projectRoot,
      explicitlyConfigured: true,
    });

    for (const skill of registry.list()) {
      expect(skill.files.length).toBeGreaterThan(0);
      expect(skill.files.every((file) => file.category === 'reference')).toBe(true);
      expect(skill.files.every((file) => file.isBinary === false)).toBe(true);
    }
  });
});
