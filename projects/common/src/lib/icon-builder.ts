import { capitalCase } from 'change-case';
import { readFileSync } from 'fs';
import { access, constants, mkdir, readFile } from 'fs/promises';
import { Config, optimize } from 'svgo';
import { iconsLibPath, placeholderPath } from './constants';
import { Registry, RegistryContent } from './registry-type';

const COMPONENT_NAME_KEY = 'IconComponent';
const SELECTOR_KEY = 'app-icon';

const CONTENT_TOKEN = 'CONTENT';

const iconPlaceholder = readFileSync(placeholderPath(), 'utf-8');

export class IconBuilder {
  constructor(
    private icon: {
      name: string;
      path: string;
      registry: Registry;
      fullPath: string;
      registryContent: RegistryContent;
    },
    private debugMode?: boolean
  ) {}

  async process() {
    this.createDirIfEmpty();
    let svgContent = await readFile(this.icon.path, 'utf-8');
    const componentName = this.resolveComponentName();
    const selector = this.resolveSelector();
    const placeholderContent = iconPlaceholder;

    svgContent = this.tryOptimize(svgContent);

    //Replaces template with SVG
    let iconContent = placeholderContent.replace(CONTENT_TOKEN, svgContent);

    iconContent = iconContent.replace(COMPONENT_NAME_KEY, componentName);
    iconContent = iconContent.replace(SELECTOR_KEY, selector);

    if (this.debugMode) {
      console.log('Selector ', selector);
      console.log('Component Name ', componentName);
    }

    const newFilePath = this.resolvenewFilePath();
    return {
      svgContent,
      newFilePath: newFilePath,
      content: iconContent,
      selector,
      compName: componentName,
      iconType: this.icon.registryContent.resolveType?.(
        this.icon.name,
        this.icon.fullPath,
        this.icon.name.replace('.svg', '')
      ),
    };
  }

  tryOptimize(svgContent: string) {
    if (this.icon.registryContent.svgo) {
      const isBooleanConfig =
        typeof this.icon.registryContent.svgo === 'boolean';

      const config = isBooleanConfig
        ? undefined
        : (this.icon.registryContent.svgo as Config);
      return optimize(svgContent, config).data;
    }
    return svgContent;
  }

  private getOutputPath() {
    return `${iconsLibPath()}/`;
  }

  private async createDirIfEmpty() {
    try {
      await access(this.getOutputPath(), constants.F_OK);
    } catch {
      try {
        await mkdir(this.getOutputPath(), { recursive: true });
      } catch (err) {
        console.error('Error creating folder:', err);
      }
    }
  }

  private startsWithNumber(name: string) {
    return !isNaN(Number(name[0]));
  }

  private resolveComponentName() {
    let merged = `${this.icon.registryContent.componentName(
      this.icon.name,
      this.icon.fullPath,
      this.icon.name.replace('.svg', '')
    )}Icon`;

    //If starts with number add prefix
    if (this.startsWithNumber(merged)) {
      merged = `${capitalCase(this.icon.registry.id)}${merged}`;
    }

    return merged;
  }

  private resolveSelector() {
    let merged = `${this.icon.registryContent.selector(
      this.icon.name,
      this.icon.fullPath,
      this.icon.name.replace('.svg', '')
    )}-icon`;
    //If starts with number add prefix
    if (this.startsWithNumber(merged)) {
      merged = `${this.icon.registry.id}-${merged}`;
    }
    return merged;
  }

  private resolvenewFilePath() {
    const merged = `${this.icon.registryContent.selector(
      this.icon.name,
      this.icon.fullPath,
      this.icon.name.replace('.svg', '')
    )}`;
    return merged;
  }
}
