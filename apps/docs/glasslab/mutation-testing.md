# Mutation Testing

`mutation_test` copies the project into a temporary workspace, applies boolean/comparison/return mutations, and runs related tests.

The working tree is never mutated permanently. Surviving mutants indicate weak tests.
