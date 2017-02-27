extern crate evdev;

fn main() {
    let mut args = std::env::args_os();

    if args.len() < 2 {
        println!("usage: {:?} device", args.nth(0).unwrap());
        return;
    }
    let dev_name = args.nth(1).unwrap();


    let mut d = evdev::Device::open(&dev_name).unwrap();

    println!("input ID: {:?}", d.input_id());
    println!("supported events: {:?}", d.events_supported());
    println!("properties: {:?}", d.properties());
    println!("leds supported??: {:?}", d.leds_supported()); // :{
    println!("keys: {:?}", d.keys_supported());
    println!("switches: {:?}", d.switches_supported());
    println!("misc props: {:?}", d.misc_properties());


    loop {
        // for ev in d.events().unwrap() {
        for ev in d.events_no_sync().unwrap() {
            if ev._type == 1 {
                if ev.value == 1 {
                    print!("pressed  ");
                } else {
                    print!("released ");
                }
                println!(" button {:?}", ev.code);

            } else if ev._type == 3 {
                println!("rotary button {:?} ({:?})", ev.code, ev.value);
                // todo keep track of left/right with last value
            } else if ev._type == 0 {
                // ignored
            } else {
                println!("{:?}", ev);
            }


        }
    }
}
