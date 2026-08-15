fn ping() -> &'static str { "pong" }

#[cfg(test)]
mod tests {
    #[test]
    fn works() { assert_eq!(super::ping(), "pong"); }
}
