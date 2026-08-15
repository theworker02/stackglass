package greet

import "testing"

func TestHello(t *testing.T) {
  if Hello() != "hi" { t.Fatal("nope") }
}
