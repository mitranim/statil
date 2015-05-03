// Options passed into the statil constructor.
interface StatilOptions extends _.TemplateSettings {
  // If present, this is applied to each output path when rendering templates.
  // If a value is returned, it replaces the "original" rendered path.
  rename?(path: string): string|void
}

// File description in yaml metadata.
declare type Legend = {
  name?: string
  echo?: string[]
};

// Data passed to a template function.
declare type Data = {
  name?: string
  $path?: string
  $content?: string
  $title?: string
  $meta?: {}
  $?: Data
};
