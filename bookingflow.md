1> after having things from pubs and subs it will store in redis queue 
    it will check duplication
2> and then rawData is stored in rawData table (mail template is handled after that to insert it in booking table)
    it will check duplication as well
3> after having a clean data table it will push to assignment using Bull mq 
    - it will check duplication and cancelation
    - when booking table has booking it will push right away in assignment -> it will check private or group tour on booking -> it will put in table with sequence to support drag and drop by admin as needed -> it will put booking in assignment table and handling on dispatch board to see the layout clearly it will check if a booking with a tour does not have it will create a box represented a a bus (booking will be put in it will handle calculation to make sure a bus <=12paxes/bus, then i will check longtitude and latitude with root coordinate to put in the order from top to bottom nearest to farest, it will check which tourguide is available it will put in driver (bus of company first) and tourguide (prioritize for company's tourguide first)) but admin can drag and drop booking from this bus to other bus , every change it will update the order on assignment but booking is a root can not be changed.
4> make sure transportation provider will update their driver before 11pm every night , if they do not update it will be empty when 3 am the system will order , when admin looks at ordering, if it is ok, admin will click dispatched and tour will be assigned for tourguide and driver .... (driver and tourguide just see what belongs to them )





<!-- on backend have you hanlded backend for data from booking to assignment (on assignment will handle bull mq to handle logic checking it will check booking is private or group tour if it is a group it will check the tour is initialized bus for that tour or not , if not yet, it will init and check for other booking until it has <=12 paxes/ bus, if the bookings exceed >12 it will create a nother bus with the same name with a vailable bus before. if i will check the name of tour first to handle whether the name of tour's bus created or not , and then it will put driver and tour guide in the field and the status is pending, after 3 am every day, admin will check and dispatch driver and tourguide will get their assignment, drag and drop on assignemnt will be handled) -->


<!-- what happened when assignment table is empty but dispatch board has data. you know i do not want to have status fake data to fetch data right at assignment table and dispatch board you know, everything about fake data you need to push them to database to make it real, but it is fake for testing (right at assignment you need to handle checking private or group tour and <=12 paxes/bus, logic to check tour for private or group tour, if it exists but it still has more bookings the name tour name it will create another bus, the logic just order buses for all dates, but it does not assign driver and tourguide, even the name of vehicle as well) the logic just checks logic for current date -->


<!-- drag and drop : just allow drag and drop on current data, completed tour can not be changed after, to reduce mistake we need to do that  -->