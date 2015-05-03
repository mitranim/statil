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
